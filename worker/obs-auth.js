/**
 * obs-auth.js — Per-user opaque OBS Browser Source token management in D1
 */

import { jsonResponse } from './proxy.js';

const OBS_KEY_RE = /^[A-Za-z0-9_-]{16,128}$/;
const obsTableReadyDbs = new WeakSet();

export async function ensureObsTable(db) {
    if (!db || obsTableReadyDbs.has(db)) return;
    await db.prepare(
        'CREATE TABLE IF NOT EXISTS obs_tokens (' +
        'obs_key TEXT PRIMARY KEY, ' +
        'twitch_user_id TEXT NOT NULL UNIQUE, ' +
        'twitch_login TEXT NOT NULL DEFAULT \'\', ' +
        'twitch_display_name TEXT NOT NULL DEFAULT \'\', ' +
        'twitch_avatar TEXT NOT NULL DEFAULT \'\', ' +
        'created_at INTEGER NOT NULL DEFAULT 0)'
    ).run();
    obsTableReadyDbs.add(db);
}

function generateObsKey() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function sanitizeObsProfile(profile, fallbackLogin) {
    const rawName = typeof profile?.displayName === 'string' ? profile.displayName.trim() : '';
    const displayName = (rawName || fallbackLogin || '').slice(0, 64);
    let avatar = '';
    if (typeof profile?.avatar === 'string') {
        const trimmed = profile.avatar.trim();
        if (/^https:\/\//i.test(trimmed)) avatar = trimmed.slice(0, 512);
    }
    return { displayName, avatar };
}

export async function authenticateObsKeyValue(rawKey, env) {
    const clean = typeof rawKey === 'string' ? rawKey.trim() : '';
    if (!clean || !OBS_KEY_RE.test(clean) || !env?.DB) return null;
    await ensureObsTable(env.DB);
    const row = await env.DB.prepare(
        'SELECT twitch_user_id, twitch_login, twitch_display_name, twitch_avatar FROM obs_tokens WHERE obs_key = ?'
    ).bind(clean).first();
    if (!row || !row.twitch_user_id) return null;
    return {
        userId: String(row.twitch_user_id),
        login: String(row.twitch_login || ''),
        displayName: String(row.twitch_display_name || row.twitch_login || ''),
        avatar: String(row.twitch_avatar || ''),
        authMethod: 'obs',
    };
}

export async function authenticateObsKey(request, env) {
    return authenticateObsKeyValue(request.headers.get('X-ClipQ-Obs-Key') || '', env);
}

export async function getOrCreateObsKey(db, identity) {
    await ensureObsTable(db);
    const existing = await db.prepare(
        'SELECT obs_key FROM obs_tokens WHERE twitch_user_id = ?'
    ).bind(identity.userId).first();
    if (existing?.obs_key) {
        return String(existing.obs_key);
    }

    const candidate = generateObsKey();
    await db.prepare(
        'INSERT INTO obs_tokens (obs_key, twitch_user_id, twitch_login, twitch_display_name, twitch_avatar, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(twitch_user_id) DO NOTHING'
    ).bind(
        candidate,
        identity.userId,
        identity.login,
        identity.login,
        '',
        Date.now()
    ).run();

    const stored = await db.prepare(
        'SELECT obs_key FROM obs_tokens WHERE twitch_user_id = ?'
    ).bind(identity.userId).first();
    return stored?.obs_key ? String(stored.obs_key) : candidate;
}

export async function syncObsProfile(db, identity, profile) {
    await ensureObsTable(db);
    const clean = sanitizeObsProfile(profile, identity.login);
    await db.prepare(
        'UPDATE obs_tokens SET twitch_login = ?, twitch_display_name = ?, twitch_avatar = ? WHERE twitch_user_id = ?'
    ).bind(identity.login, clean.displayName, clean.avatar, identity.userId).run();
}

export async function rotateObsKey(db, identity, profile) {
    await ensureObsTable(db);
    const clean = sanitizeObsProfile(profile, identity.login);
    const nextKey = generateObsKey();
    await db.prepare(
        'INSERT INTO obs_tokens (obs_key, twitch_user_id, twitch_login, twitch_display_name, twitch_avatar, created_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(twitch_user_id) DO UPDATE SET ' +
        'obs_key = excluded.obs_key, ' +
        'twitch_login = excluded.twitch_login, ' +
        'twitch_display_name = CASE WHEN excluded.twitch_display_name <> \'\' THEN excluded.twitch_display_name ELSE obs_tokens.twitch_display_name END, ' +
        'twitch_avatar = CASE WHEN excluded.twitch_avatar <> \'\' THEN excluded.twitch_avatar ELSE obs_tokens.twitch_avatar END, ' +
        'created_at = excluded.created_at'
    ).bind(
        nextKey,
        identity.userId,
        identity.login,
        clean.displayName,
        clean.avatar,
        Date.now()
    ).run();
    return jsonResponse({ obsKey: nextKey });
}
