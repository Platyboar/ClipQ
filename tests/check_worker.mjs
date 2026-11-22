/**
 * End-to-end verification of Cloudflare worker.js, SSRF proxies, schema.sql, and D1 sync endpoints.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import worker from '../worker.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createD1Adapter(sqliteDb) {
    const makeBound = (sql, params) => {
        const clean = params.map((v) => (v === undefined ? null : v));
        return {
            async first() {
                return sqliteDb.prepare(sql).get(...clean) ?? null;
            },
            async all() {
                return { results: sqliteDb.prepare(sql).all(...clean) };
            },
            async run() {
                return sqliteDb.prepare(sql).run(...clean);
            },
        };
    };
    return {
        prepare(sql) {
            return {
                bind(...params) {
                    return makeBound(sql, params);
                },
                first() {
                    return makeBound(sql, []).first();
                },
                all() {
                    return makeBound(sql, []).all();
                },
                run() {
                    return makeBound(sql, []).run();
                },
            };
        },
        async batch(statements) {
            const results = [];
            for (const stmt of statements) {
                results.push(await stmt.run());
            }
            return results;
        },
    };
}

function createAssetsMock() {
    return {
        async fetch(request) {
            const reqUrl = new URL(request.url);
            if (reqUrl.pathname === '/index.html') {
                return new Response(null, { status: 307, headers: { Location: '/' } });
            }
            if (reqUrl.pathname === '/') {
                return new Response('<html><title>ClipQ</title></html>', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' },
                });
            }
            if (reqUrl.pathname === '/css/fonts.css') {
                return new Response('/* fonts */', { status: 200 });
            }
            return new Response('Not found', { status: 404 });
        },
    };
}

async function callWorker(pathAndQuery, env, options = {}) {
    const req = new Request(`https://clipq.example${pathAndQuery}`, options);
    const resp = await worker.fetch(req, env);
    const text = await resp.text();
    let json = null;
    try {
        json = JSON.parse(text);
    } catch { /* non-JSON static/404 response */ }
    return { status: resp.status, text, json, headers: resp.headers };
}

async function main() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf-8'));

    const roomNotifications = [];
    const env = {
        DB: createD1Adapter(sqlite),
        ASSETS: createAssetsMock(),
        CLIPQ_ROOM: {
            idFromName(name) {
                return `room:${name}`;
            },
            get(id) {
                return {
                    async fetch(req) {
                        const reqUrl = new URL(req.url);
                        if (reqUrl.pathname === '/notify') {
                            roomNotifications.push({ room: id, payload: JSON.parse(await req.text()) });
                            return new Response(JSON.stringify({ ok: true }), { status: 200 });
                        }
                        return new Response('room-ws-mock', { status: 200 });
                    },
                };
            },
        },
    };

    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        const target = typeof url === 'string' ? url : url.url;
        if (target === 'https://id.twitch.tv/oauth2/validate') {
            const auth = init?.headers?.Authorization || '';
            if (auth === 'OAuth token_user1') {
                return new Response(JSON.stringify({
                    client_id: 'fvu8e09aa5f2xhomhll396ogkdyckb',
                    login: 'streamer_one',
                    user_id: '11111',
                    expires_in: 3600,
                }), { status: 200 });
            }
            if (auth === 'OAuth token_user2') {
                return new Response(JSON.stringify({
                    client_id: 'fvu8e09aa5f2xhomhll396ogkdyckb',
                    login: 'streamer_two',
                    user_id: '22222',
                    expires_in: 3600,
                }), { status: 200 });
            }
            return new Response(JSON.stringify({ status: 401, message: 'invalid access token' }), { status: 401 });
        }
        if (target === 'https://id.twitch.tv/oauth2/token') {
            return new Response(JSON.stringify({ access_token: 'app_tok_1', expires_in: 3600 }), { status: 200 });
        }
        if (target.startsWith('https://api.twitch.tv/helix/clips?id=')) {
            if (target.endsWith('id=MissingClip999')) {
                return new Response(JSON.stringify({ data: [] }), { status: 200 });
            }
            return new Response(JSON.stringify({
                data: [{
                    id: 'GoodClip1',
                    title: 'Nice Play',
                    broadcaster_id: '777',
                    broadcaster_name: 'ProPlayer',
                    game_id: '42',
                    creator_name: 'Clipper',
                    created_at: '2026-11-16T00:00:00Z',
                    thumbnail_url: 'https://clips-media-assets2.twitch.tv/thumb.jpg',
                    duration: 24.5,
                    view_count: 100,
                }],
            }), { status: 200 });
        }
        if (target.startsWith('https://api.twitch.tv/helix/videos?id=')) {
            return new Response(JSON.stringify({
                data: [{
                    id: '987654321',
                    title: 'Full Stream',
                    user_id: '777',
                    user_name: 'ProPlayer',
                    created_at: '2026-11-16T00:00:00Z',
                    thumbnail_url: 'https://static-cdn.jtvnw.net/%{width}x%{height}.jpg',
                    duration: '1m30s',
                }],
            }), { status: 200 });
        }
        if (target.startsWith('https://api.twitch.tv/helix/users?id=777')) {
            return new Response(JSON.stringify({
                data: [{ login: 'proplayer', profile_image_url: 'https://static-cdn.jtvnw.net/avatar.png' }],
            }), { status: 200 });
        }
        if (target.startsWith('https://api.twitch.tv/helix/games?id=42')) {
            return new Response(JSON.stringify({
                data: [{ name: 'Just Chatting' }],
            }), { status: 200 });
        }
        if (target === 'https://api.twitch.tv/helix/chat/badges/global') {
            return new Response(JSON.stringify({
                data: [{ set_id: 'moderator', versions: [{ id: '1', image_url_1x: 'https://static-cdn.jtvnw.net/mod1x.png', image_url_2x: 'https://static-cdn.jtvnw.net/mod2x.png', title: 'Moderator' }] }],
            }), { status: 200 });
        }
        if (target.startsWith('https://api.twitch.tv/helix/chat/badges?broadcaster_id=777')) {
            return new Response(JSON.stringify({
                data: [{ set_id: 'subscriber', versions: [{ id: '12', image_url_1x: 'https://static-cdn.jtvnw.net/sub12_1x.png', image_url_2x: 'https://static-cdn.jtvnw.net/sub12_2x.png', title: '1-Year Subscriber' }] }],
            }), { status: 200 });
        }
        return origFetch(url, init);
    };

    try {
        const health = await callWorker('/health', env);
        assert.equal(health.status, 200);
        assert.deepEqual(health.json, { ok: true, sync: true });

        const unknownApi = await callWorker('/api/unknown', env);
        assert.equal(unknownApi.status, 404);
        assert.deepEqual(unknownApi.json, { error: 'Not found' });

        const spaFallback = await callWorker('/dashboard', env);
        assert.equal(spaFallback.status, 200);
        assert.ok(spaFallback.text.includes('ClipQ'));

        const obsSpaFallback = await callWorker('/obs', env);
        assert.equal(obsSpaFallback.status, 200);
        assert.ok(obsSpaFallback.text.includes('ClipQ'));
        assert.equal(obsSpaFallback.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');

        const obsKeySpaFallback = await callWorker('/obs/sample_obs_key_1234567890', env);
        assert.equal(obsKeySpaFallback.status, 200);
        assert.equal(obsKeySpaFallback.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
        assert.equal(obsKeySpaFallback.headers.get('Cache-Control'), 'no-store');

        const badAsset = await callWorker('/js/missing.js', env);
        assert.equal(badAsset.status, 404);

        const auth1 = { Authorization: 'Bearer token_user1' };
        const auth2 = { Authorization: 'Bearer token_user2' };

        assert.equal((await callWorker('/api/oembed', env)).status, 401);
        assert.equal((await callWorker('/api/youtube-meta?id=dQw4w9WgXcQ', env)).status, 401);
        assert.equal(
            (await callWorker('/api/video-url?url=https://www.instagram.com/reel/DfItNRUiKTV/', env)).status,
            401
        );

        assert.equal((await callWorker('/api/oembed', env, { headers: auth1 })).status, 400);
        assert.equal(
            (await callWorker('/api/oembed?url=http://127.0.0.1/evil', env, { headers: auth1 })).status,
            403
        );
        assert.equal((await callWorker('/api/youtube-meta?id=bad!id', env, { headers: auth1 })).status, 400);
        assert.equal(
            (await callWorker('/api/video-url?url=http://169.254.169.254/latest', env, { headers: auth1 })).status,
            403
        );

        const videoFallback = await callWorker(
            '/api/video-url?url=https://www.instagram.com/reel/DfItNRUiKTV/',
            env,
            { headers: auth1 }
        );
        assert.equal(videoFallback.status, 200);
        assert.deepEqual(videoFallback.json, { url: null });

        assert.equal((await callWorker('/api/sync', env)).status, 401);
        assert.equal((await callWorker('/api/sync', env, { headers: { Authorization: 'Bearer bad_token' } })).status, 401);

        const emptySync = await callWorker('/api/sync', env, { headers: auth1 });
        assert.equal(emptySync.status, 200);
        assert.equal(emptySync.json.exists, false);
        assert.match(emptySync.json.obsKey, /^[A-Za-z0-9_-]{16,128}$/);
        const obsKey1 = emptySync.json.obsKey;

        const putBody = JSON.stringify({
            settings: { appTitle: 'CloudClipQ', userClipLimit: 3 },
            customDesign: { fontFamily: 'Poppins', colors: { '--color-accent': 'rgba(1,2,3,1)' } },
            language: 'de',
            autoplay: true,
            clientId: 'tab_mod_1',
            profile: { displayName: 'StreamerOne', avatar: 'https://static-cdn.jtvnw.net/u1.png' },
        });
        const putCfg = await callWorker('/api/sync/config', env, {
            method: 'PUT',
            headers: { ...auth1, 'Content-Type': 'application/json' },
            body: putBody,
        });
        assert.equal(putCfg.status, 200);
        assert.equal(putCfg.json.changed, true);
        assert.equal(roomNotifications.length, 1);
        assert.equal(roomNotifications[0].payload.source, 'tab_mod_1');

        const putCfgSame = await callWorker('/api/sync/config', env, {
            method: 'PUT',
            headers: { ...auth1, 'Content-Type': 'application/json' },
            body: putBody,
        });
        assert.equal(putCfgSame.status, 200);
        assert.equal(putCfgSame.json.changed, false);
        assert.equal(roomNotifications.length, 1);

        const batchItems = [];
        for (let i = 1; i <= 550; i++) {
            batchItems.push({
                id: `clip_${i}`,
                provider: 'youtube',
                clipId: `vid_${i}`,
                url: `https://youtu.be/vid_${i}`,
                meta: { title: `Clip ${i}`, channel: 'Chan' },
                addedAt: 1000 + i,
                watchedAt: 2000 + i,
            });
        }
        const postHist = await callWorker('/api/sync/history', env, {
            method: 'POST',
            headers: { ...auth1, 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: batchItems }),
        });
        assert.equal(postHist.status, 200);
        assert.equal(postHist.json.count, 550);

        const postMem = await callWorker('/api/sync/memory', env, {
            method: 'POST',
            headers: { ...auth1, 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys: ['youtube:vid_1', 'youtube:vid_2'] }),
        });
        assert.equal(postMem.status, 200);

        const page1 = await callWorker('/api/sync?limit=300', env, { headers: auth1 });
        assert.equal(page1.status, 200);
        assert.equal(page1.json.exists, true);
        assert.equal(page1.json.config.settings.appTitle, 'CloudClipQ');
        assert.equal(page1.json.config.language, 'de');
        assert.equal(page1.json.config.autoplay, true);
        assert.equal(page1.json.historyTotal, 550);
        assert.equal(page1.json.hasMoreHistory, true);
        assert.equal(page1.json.history.length, 300);
        assert.equal(page1.json.history[0].id, 'clip_251');
        assert.equal(page1.json.history[299].id, 'clip_550');

        const page2 = await callWorker('/api/sync/history?offset=300&limit=300', env, { headers: auth1 });
        assert.equal(page2.status, 200);
        assert.equal(page2.json.items.length, 250);
        assert.equal(page2.json.items[0].id, 'clip_1');
        assert.equal(page2.json.items[249].id, 'clip_250');

        const user2Sync = await callWorker('/api/sync', env, { headers: auth2 });
        assert.equal(user2Sync.status, 200);
        assert.equal(user2Sync.json.exists, false);
        assert.notEqual(user2Sync.json.obsKey, obsKey1);

        const obsHeaders1 = { 'X-ClipQ-Obs-Key': obsKey1 };
        const obsInitial = await callWorker('/api/sync?limit=10', env, { headers: obsHeaders1 });
        assert.equal(obsInitial.status, 200);
        assert.equal(obsInitial.json.userId, '11111');
        assert.equal(obsInitial.json.displayName, 'StreamerOne');
        assert.equal(obsInitial.json.avatar, 'https://static-cdn.jtvnw.net/u1.png');
        assert.equal(obsInitial.json.isObsSession, true);
        assert.equal(obsInitial.json.config.settings.appTitle, 'CloudClipQ');
        assert.equal((await callWorker('/api/sync', env, { method: 'DELETE', headers: obsHeaders1 })).status, 403);
        assert.equal((await callWorker('/api/sync/export', env, { headers: obsHeaders1 })).status, 403);
        assert.equal((await callWorker('/api/sync/obs-key', env, { method: 'POST', headers: obsHeaders1 })).status, 403);

        assert.equal((await callWorker('/api/twitch-meta?type=clip&id=GoodClip1', env)).status, 401);
        assert.equal((await callWorker('/api/twitch-meta?type=clip&id=bad!id', env, { headers: obsHeaders1 })).status, 400);
        const noSecretMeta = await callWorker('/api/twitch-meta?type=clip&id=GoodClip1', env, { headers: obsHeaders1 });
        assert.equal(noSecretMeta.status, 200);
        assert.deepEqual(noSecretMeta.json, { configured: false, available: true, meta: null });

        const secretEnv = { ...env, TWITCH_CLIENT_SECRET: 'twitch_app_secret' };
        const clipMeta = await callWorker('/api/twitch-meta?type=clip&id=GoodClip1', secretEnv, { headers: obsHeaders1 });
        assert.equal(clipMeta.status, 200);
        assert.equal(clipMeta.json.available, true);
        assert.equal(clipMeta.json.meta.title, 'Nice Play');
        assert.equal(clipMeta.json.meta.channel, 'ProPlayer');
        assert.equal(clipMeta.json.meta.category, 'Just Chatting');
        assert.equal(clipMeta.json.meta.duration, 24.5);
        assert.equal(clipMeta.json.meta.canonicalUrl, 'https://www.twitch.tv/proplayer/clip/GoodClip1');

        const missingClipMeta = await callWorker('/api/twitch-meta?type=clip&id=MissingClip999', secretEnv, { headers: obsHeaders1 });
        assert.equal(missingClipMeta.json.available, false);
        assert.equal(missingClipMeta.json.unavailable, true);

        const vodMeta = await callWorker('/api/twitch-meta?type=vod&id=987654321', secretEnv, { headers: obsHeaders1 });
        assert.equal(vodMeta.status, 200);
        assert.equal(vodMeta.json.meta.duration, 90);

        const badgesMeta = await callWorker('/api/twitch-meta?type=badges&id=777', secretEnv, { headers: obsHeaders1 });
        assert.equal(badgesMeta.status, 200);
        assert.equal(badgesMeta.json.badges.moderator['1'].url, 'https://static-cdn.jtvnw.net/mod2x.png');
        assert.equal(badgesMeta.json.badges.subscriber['12'].url, 'https://static-cdn.jtvnw.net/sub12_2x.png');

        const cfgOnly = await callWorker('/api/sync?configOnly=1', env, { headers: obsHeaders1 });
        assert.equal(cfgOnly.status, 200);
        assert.equal(cfgOnly.json.config.settings.appTitle, 'CloudClipQ');
        assert.equal(cfgOnly.json.history, undefined);

        assert.equal((await callWorker('/api/sync/ws', env)).status, 401);
        const wsRoute = await callWorker(`/api/sync/ws?obsKey=${encodeURIComponent(obsKey1)}`, env);
        assert.equal(wsRoute.status, 200);
        assert.equal(wsRoute.text, 'room-ws-mock');

        const rotated = await callWorker('/api/sync/obs-key', env, {
            method: 'POST',
            headers: { ...auth1, 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: 'UpdatedName' }),
        });
        assert.equal(rotated.status, 200);
        const obsKey1Rotated = rotated.json.obsKey;
        assert.notEqual(obsKey1Rotated, obsKey1);
        assert.equal((await callWorker('/api/sync', env, { headers: obsHeaders1 })).status, 401);
        const rotatedCheck = await callWorker('/api/sync?limit=5', env, { headers: { 'X-ClipQ-Obs-Key': obsKey1Rotated } });
        assert.equal(rotatedCheck.status, 200);
        assert.equal(rotatedCheck.json.displayName, 'UpdatedName');

        const exp = await callWorker('/api/sync/export', env, { headers: auth1 });
        assert.equal(exp.status, 200);
        assert.equal(exp.json.history.length, 550);
        assert.equal(exp.json.memory.length, 2);

        await callWorker('/api/sync/history?id=clip_550', env, { method: 'DELETE', headers: auth1 });
        const afterSingleDel = await callWorker('/api/sync?limit=10', env, { headers: auth1 });
        assert.equal(afterSingleDel.json.historyTotal, 549);

        const delAll = await callWorker('/api/sync', env, { method: 'DELETE', headers: auth1 });
        assert.equal(delAll.status, 200);
        assert.equal((await callWorker('/api/sync', env, { headers: { 'X-ClipQ-Obs-Key': obsKey1Rotated } })).status, 401);
        const afterPurge = await callWorker('/api/sync', env, { headers: auth1 });
        assert.equal(afterPurge.json.exists, false);
        assert.equal(afterPurge.json.historyTotal, 0);

        console.log(JSON.stringify({ status: 'ok', worker_routes_verified: 22, d1_history_tested: 550 }));
    } finally {
        globalThis.fetch = origFetch;
        sqlite.close();
    }
}

await main();
