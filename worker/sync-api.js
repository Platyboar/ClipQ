/**
 * sync-api.js — Twitch-authenticated D1 persistence endpoints for ClipQ
 */

import {
    authenticateObsKey,
    authenticateObsKeyValue,
    ensureObsTable,
    getObsKeyState,
    rotateObsKey,
    syncObsProfile,
} from './obs-auth.js';
import { jsonResponse } from './proxy.js';
import { fetchTwitchUserProfile } from './twitch-meta.js';

const DEFAULT_TWITCH_CLIENT_ID = 'fvu8e09aa5f2xhomhll396ogkdyckb';
const MAX_BODY_BYTES = 512 * 1024;
const INITIAL_HISTORY_LIMIT = 1000;
const MAX_BATCH_SIZE = 50;
const TOKEN_CACHE_TTL_MS = 60 * 1000;
const TOKEN_CACHE_MAX = 500;

const tokenCache = new Map();

async function hashToken(token) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function authenticateTwitchRequest(request, env) {
    const authHeader = request.headers.get('Authorization') || '';
    const match = authHeader.match(/^Bearer\s+([A-Za-z0-9._~+/-]+=*)$/);
    if (!match) return null;
    const token = match[1];
    const cacheKey = await hashToken(token);
    const cached = tokenCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
        return cached.identity;
    }

    try {
        const resp = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: { 'Authorization': `OAuth ${token}` },
            signal: AbortSignal.timeout(5000),
        });
        if (!resp.ok) {
            tokenCache.delete(cacheKey);
            return null;
        }
        const data = await resp.json();
        const expectedClientId = (env?.TWITCH_CLIENT_ID || DEFAULT_TWITCH_CLIENT_ID).trim();
        if (!data || !data.user_id || (expectedClientId && data.client_id !== expectedClientId)) {
            return null;
        }
        const expiresInMs = Math.max(1000, Number(data.expires_in || 60) * 1000);
        const identity = {
            userId: String(data.user_id),
            login: String(data.login || ''),
            authMethod: 'twitch',
        };
        if (tokenCache.size >= TOKEN_CACHE_MAX) {
            tokenCache.clear();
        }
        tokenCache.set(cacheKey, {
            identity,
            expiresAt: Math.min(now + TOKEN_CACHE_TTL_MS, now + expiresInMs),
        });
        return identity;
    } catch {
        return null;
    }
}

export async function authenticateRequest(request, env) {
    const twitchIdentity = await authenticateTwitchRequest(request, env);
    if (twitchIdentity) return twitchIdentity;
    return authenticateObsKey(request, env);
}

async function readJsonBody(request) {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
        return { error: jsonResponse({ error: 'Payload too large' }, 413) };
    }
    try {
        const data = JSON.parse(text || '{}');
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return { error: jsonResponse({ error: 'Invalid JSON object' }, 400) };
        }
        return { data };
    } catch {
        return { error: jsonResponse({ error: 'Invalid JSON' }, 400) };
    }
}

function safeParseJson(raw, fallback) {
    if (!raw || typeof raw !== 'string') return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

async function runBatchedStatements(db, statements) {
    for (let i = 0; i < statements.length; i += MAX_BATCH_SIZE) {
        await db.batch(statements.slice(i, i + MAX_BATCH_SIZE));
    }
}

async function fetchHistoryPage(db, userId, limit, offset) {
    const rowsResult = await db.prepare(
        'SELECT clip_json FROM clip_history WHERE twitch_user_id = ? ORDER BY watched_at DESC, rowid DESC LIMIT ? OFFSET ?'
    ).bind(userId, limit, offset).all();
    const rawRows = rowsResult?.results || [];
    const items = [];
    for (let i = rawRows.length - 1; i >= 0; i--) {
        const parsed = safeParseJson(rawRows[i].clip_json, null);
        if (parsed && typeof parsed === 'object') items.push(parsed);
    }
    return { items, rawCount: rawRows.length };
}

async function notifyRoom(env, userId, payload) {
    if (!env?.CLIPQ_ROOM || !userId) return;
    try {
        const roomId = env.CLIPQ_ROOM.idFromName(String(userId));
        const stub = env.CLIPQ_ROOM.get(roomId);
        await stub.fetch(new Request('https://clipq-room/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }));
    } catch { /* ignore transient room notification failures */ }
}

function formatConfigRow(cfgRow) {
    return cfgRow ? {
        settings: safeParseJson(cfgRow.settings_json, {}),
        customDesign: safeParseJson(cfgRow.custom_design_json, null),
        customLayout: safeParseJson(cfgRow.custom_layout_json, null),
        queue: safeParseJson(cfgRow.queue_json, null),
        language: cfgRow.language || 'en',
        autoplay: cfgRow.autoplay === 1,
        updatedAt: cfgRow.updated_at || 0,
    } : null;
}

async function handleGetInitial(db, identity, reqUrl, env) {
    const cfgRow = await db.prepare(
        'SELECT twitch_login, settings_json, custom_design_json, custom_layout_json, queue_json, language, autoplay, updated_at FROM user_configs WHERE twitch_user_id = ?'
    ).bind(identity.userId).first();

    if (reqUrl.searchParams.get('configOnly') === '1') {
        return jsonResponse({
            exists: Boolean(cfgRow),
            userId: identity.userId,
            login: identity.login,
            config: formatConfigRow(cfgRow),
        });
    }

    const limit = Math.min(2000, Math.max(1, Number.parseInt(reqUrl.searchParams.get('limit') || '', 10) || INITIAL_HISTORY_LIMIT));
    const offset = Math.max(0, Number.parseInt(reqUrl.searchParams.get('historyOffset') || '', 10) || 0);

    const countRow = await db.prepare(
        'SELECT COUNT(*) AS cnt FROM clip_history WHERE twitch_user_id = ?'
    ).bind(identity.userId).first();
    const historyTotal = Number(countRow?.cnt || 0);

    const { items: history } = await fetchHistoryPage(db, identity.userId, limit, offset);
    const memResult = await db.prepare(
        'SELECT clip_key FROM clip_memory WHERE twitch_user_id = ? ORDER BY created_at ASC, rowid ASC'
    ).bind(identity.userId).all();
    const memory = (memResult?.results || []).map((row) => row.clip_key).filter(Boolean);

    const exists = Boolean(cfgRow || historyTotal > 0 || memory.length > 0);
    const payload = {
        exists,
        userId: identity.userId,
        login: identity.login,
        config: formatConfigRow(cfgRow),
        history,
        historyTotal,
        hasMoreHistory: offset + limit < historyTotal,
        memory,
    };

    if (identity.authMethod === 'obs') {
        let displayName = identity.displayName || identity.login;
        let avatar = identity.avatar || '';
        if (!avatar) {
            const liveProfile = await fetchTwitchUserProfile(identity.userId, env);
            if (liveProfile) {
                displayName = liveProfile.displayName || displayName;
                avatar = liveProfile.avatar || '';
                await syncObsProfile(db, identity, { displayName, avatar });
            }
        }
        payload.displayName = displayName;
        payload.avatar = avatar;
        payload.isObsSession = true;
    } else {
        const obsState = await getObsKeyState(db, identity);
        payload.obsKey = obsState.obsKey;
        if (obsState.needsProfile) payload.obsProfileMissing = true;
    }

    return jsonResponse(payload);
}

async function handleGetHistoryPage(db, identity, reqUrl) {
    const limit = Math.min(2000, Math.max(1, Number.parseInt(reqUrl.searchParams.get('limit') || '', 10) || INITIAL_HISTORY_LIMIT));
    const offset = Math.max(0, Number.parseInt(reqUrl.searchParams.get('offset') || '', 10) || 0);
    const { items, rawCount } = await fetchHistoryPage(db, identity.userId, limit, offset);
    return jsonResponse({ items, offset, hasMore: rawCount === limit });
}

async function handleExportAll(db, identity) {
    const cfgRow = await db.prepare(
        'SELECT twitch_login, settings_json, custom_design_json, custom_layout_json, queue_json, language, autoplay, updated_at FROM user_configs WHERE twitch_user_id = ?'
    ).bind(identity.userId).first();

    const histResult = await db.prepare(
        'SELECT clip_json FROM clip_history WHERE twitch_user_id = ? ORDER BY watched_at ASC, rowid ASC'
    ).bind(identity.userId).all();
    const history = (histResult?.results || [])
        .map((row) => safeParseJson(row.clip_json, null))
        .filter((item) => item && typeof item === 'object');

    const memResult = await db.prepare(
        'SELECT clip_key FROM clip_memory WHERE twitch_user_id = ? ORDER BY created_at ASC, rowid ASC'
    ).bind(identity.userId).all();
    const memory = (memResult?.results || []).map((row) => row.clip_key).filter(Boolean);

    return jsonResponse({
        exportedAt: new Date().toISOString(),
        twitchUserId: identity.userId,
        twitchLogin: identity.login,
        config: cfgRow ? {
            settings: safeParseJson(cfgRow.settings_json, {}),
            customDesign: safeParseJson(cfgRow.custom_design_json, null),
            customLayout: safeParseJson(cfgRow.custom_layout_json, null),
            queue: safeParseJson(cfgRow.queue_json, null),
            language: cfgRow.language || 'en',
            autoplay: cfgRow.autoplay === 1,
        } : null,
        history,
        memory,
    });
}

async function handlePutConfig(request, db, identity, env) {
    const parsed = await readJsonBody(request);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    const existing = await db.prepare(
        'SELECT twitch_login, settings_json, custom_design_json, custom_layout_json, queue_json, language, autoplay FROM user_configs WHERE twitch_user_id = ?'
    ).bind(identity.userId).first();

    const nextSettings = Object.prototype.hasOwnProperty.call(body, 'settings')
        ? JSON.stringify(body.settings || {})
        : (existing?.settings_json || '{}');
    const nextCustomDesign = Object.prototype.hasOwnProperty.call(body, 'customDesign')
        ? (body.customDesign ? JSON.stringify(body.customDesign) : null)
        : (existing?.custom_design_json ?? null);
    const nextCustomLayout = Object.prototype.hasOwnProperty.call(body, 'customLayout')
        ? (body.customLayout ? JSON.stringify(body.customLayout) : null)
        : (existing?.custom_layout_json ?? null);
    const nextQueue = Object.prototype.hasOwnProperty.call(body, 'queue')
        ? (body.queue ? JSON.stringify(body.queue) : null)
        : (existing?.queue_json ?? null);
    const nextLanguage = typeof body.language === 'string' && body.language
        ? body.language.slice(0, 16)
        : (existing?.language || 'en');
    const nextAutoplay = Object.prototype.hasOwnProperty.call(body, 'autoplay')
        ? (body.autoplay ? 1 : 0)
        : (existing?.autoplay ? 1 : 0);

    const unchanged = Boolean(
        existing &&
        existing.twitch_login === identity.login &&
        existing.settings_json === nextSettings &&
        (existing.custom_design_json ?? null) === nextCustomDesign &&
        (existing.custom_layout_json ?? null) === nextCustomLayout &&
        (existing.queue_json ?? null) === nextQueue &&
        (existing.language || 'en') === nextLanguage &&
        Number(existing.autoplay || 0) === nextAutoplay
    );

    if (unchanged) {
        return jsonResponse({ ok: true, changed: false });
    }

    const updatedAt = Date.now();
    await db.prepare(
        'INSERT INTO user_configs ' +
        '(twitch_user_id, twitch_login, settings_json, custom_design_json, custom_layout_json, queue_json, language, autoplay, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(twitch_user_id) DO UPDATE SET ' +
        'twitch_login = excluded.twitch_login, ' +
        'settings_json = excluded.settings_json, ' +
        'custom_design_json = excluded.custom_design_json, ' +
        'custom_layout_json = excluded.custom_layout_json, ' +
        'queue_json = excluded.queue_json, ' +
        'language = excluded.language, ' +
        'autoplay = excluded.autoplay, ' +
        'updated_at = excluded.updated_at'
    ).bind(
        identity.userId,
        identity.login,
        nextSettings,
        nextCustomDesign,
        nextCustomLayout,
        nextQueue,
        nextLanguage,
        nextAutoplay,
        updatedAt
    ).run();

    if (identity.authMethod === 'twitch' && body.profile && typeof body.profile === 'object') {
        await syncObsProfile(db, identity, body.profile);
    }

    const source = typeof body.clientId === 'string' ? body.clientId.slice(0, 64) : '';
    await notifyRoom(env, identity.userId, { type: 'sync', updatedAt, source });

    return jsonResponse({ ok: true, changed: true, updatedAt });
}

async function handlePostHistory(request, db, identity) {
    const parsed = await readJsonBody(request);
    if (parsed.error) return parsed.error;
    const rawItems = Array.isArray(parsed.data.items) ? parsed.data.items : [];
    const stmt = db.prepare(
        'INSERT OR REPLACE INTO clip_history (id, twitch_user_id, clip_json, added_at, watched_at) VALUES (?, ?, ?, ?, ?)'
    );
    const batch = [];
    for (const item of rawItems) {
        if (!item || typeof item !== 'object' || !item.id) continue;
        const addedAt = Number(item.addedAt || 0) || 0;
        const watchedAt = Number(item.watchedAt || addedAt || Date.now()) || Date.now();
        batch.push(stmt.bind(String(item.id), identity.userId, JSON.stringify(item), addedAt, watchedAt));
    }
    if (batch.length > 0) {
        await runBatchedStatements(db, batch);
    }
    return jsonResponse({ ok: true, count: batch.length });
}

async function handleDeleteHistory(db, identity, reqUrl) {
    const id = reqUrl.searchParams.get('id');
    const beforeParam = reqUrl.searchParams.get('before');
    if (id) {
        await db.prepare(
            'DELETE FROM clip_history WHERE twitch_user_id = ? AND id = ?'
        ).bind(identity.userId, id).run();
    } else if (beforeParam) {
        const cutoff = Number.parseInt(beforeParam, 10);
        if (!Number.isNaN(cutoff)) {
            await db.prepare(
                'DELETE FROM clip_history WHERE twitch_user_id = ? AND COALESCE(NULLIF(watched_at, 0), added_at) <= ?'
            ).bind(identity.userId, cutoff).run();
        }
    } else {
        await db.prepare(
            'DELETE FROM clip_history WHERE twitch_user_id = ?'
        ).bind(identity.userId).run();
    }
    return jsonResponse({ ok: true });
}

async function handlePostMemory(request, db, identity) {
    const parsed = await readJsonBody(request);
    if (parsed.error) return parsed.error;
    const keys = Array.isArray(parsed.data.keys) ? parsed.data.keys : [];
    const now = Date.now();
    const stmt = db.prepare(
        'INSERT OR IGNORE INTO clip_memory (twitch_user_id, clip_key, created_at) VALUES (?, ?, ?)'
    );
    const batch = [];
    for (const key of keys) {
        if (typeof key !== 'string' || !key) continue;
        batch.push(stmt.bind(identity.userId, key.slice(0, 512), now));
    }
    if (batch.length > 0) {
        await runBatchedStatements(db, batch);
    }
    return jsonResponse({ ok: true, count: batch.length });
}

async function handleDeleteAllUserData(db, identity) {
    await ensureObsTable(db);
    await db.batch([
        db.prepare('DELETE FROM clip_history WHERE twitch_user_id = ?').bind(identity.userId),
        db.prepare('DELETE FROM clip_memory WHERE twitch_user_id = ?').bind(identity.userId),
        db.prepare('DELETE FROM user_configs WHERE twitch_user_id = ?').bind(identity.userId),
        db.prepare('DELETE FROM obs_tokens WHERE twitch_user_id = ?').bind(identity.userId),
    ]);
    return jsonResponse({ ok: true });
}

async function handlePostObsKey(request, db, identity) {
    const parsed = await readJsonBody(request);
    if (parsed.error) return parsed.error;
    return rotateObsKey(db, identity, parsed.data);
}

export async function handleSyncWebSocket(request, reqUrl, env) {
    if (!env?.DB) {
        return jsonResponse({ error: 'Database not configured' }, 501);
    }
    if (request.method.toUpperCase() !== 'GET') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    const obsKey = reqUrl.searchParams.get('obsKey') || '';
    const identity = await authenticateObsKeyValue(obsKey, env);
    if (!identity) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    if (!env?.CLIPQ_ROOM) {
        return jsonResponse({ error: 'Live sync room not configured' }, 501);
    }
    const roomId = env.CLIPQ_ROOM.idFromName(identity.userId);
    const stub = env.CLIPQ_ROOM.get(roomId);
    return stub.fetch(request);
}

export async function handleSyncRequest(request, reqUrl, env) {
    const path = reqUrl.pathname;
    if (path === '/api/sync/ws') {
        return handleSyncWebSocket(request, reqUrl, env);
    }
    if (!env?.DB) {
        return jsonResponse({ error: 'Database not configured' }, 501);
    }
    const identity = await authenticateRequest(request, env);
    if (!identity) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const method = request.method.toUpperCase();
    const isObsForbidden =
        identity.authMethod === 'obs' &&
        (
            (path === '/api/sync' && method === 'DELETE') ||
            (path === '/api/sync/export' && method === 'GET') ||
            (path === '/api/sync/obs-key' && method === 'POST')
        );
    if (isObsForbidden) {
        return jsonResponse({ error: 'Forbidden in OBS mode' }, 403);
    }

    try {
        if (path === '/api/sync' && method === 'GET') {
            return await handleGetInitial(env.DB, identity, reqUrl, env);
        }
        if (path === '/api/sync' && method === 'DELETE') {
            return await handleDeleteAllUserData(env.DB, identity);
        }
        if (path === '/api/sync/obs-key' && method === 'POST') {
            return await handlePostObsKey(request, env.DB, identity);
        }
        if (path === '/api/sync/obs-profile' && method === 'PUT') {
            if (identity.authMethod === 'obs') return jsonResponse({ error: 'Forbidden in OBS mode' }, 403);
            const parsed = await readJsonBody(request);
            if (parsed.error) return parsed.error;
            await syncObsProfile(env.DB, identity, parsed.data);
            return jsonResponse({ ok: true });
        }
        if (path === '/api/sync/history' && method === 'GET') {
            return await handleGetHistoryPage(env.DB, identity, reqUrl);
        }
        if (path === '/api/sync/export' && method === 'GET') {
            return await handleExportAll(env.DB, identity);
        }
        if (path === '/api/sync/config' && method === 'PUT') {
            return await handlePutConfig(request, env.DB, identity, env);
        }
        if (path === '/api/sync/history' && method === 'POST') {
            return await handlePostHistory(request, env.DB, identity);
        }
        if (path === '/api/sync/history' && method === 'DELETE') {
            return await handleDeleteHistory(env.DB, identity, reqUrl);
        }
        if (path === '/api/sync/memory' && method === 'POST') {
            return await handlePostMemory(request, env.DB, identity);
        }
        if (path === '/api/sync/memory' && method === 'DELETE') {
            await env.DB.prepare('DELETE FROM clip_memory WHERE twitch_user_id = ?').bind(identity.userId).run();
            return jsonResponse({ ok: true });
        }
        return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
        return jsonResponse({ error: err?.message || 'Sync error' }, 500);
    }
}
