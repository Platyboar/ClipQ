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
            if (reqUrl.pathname === '/' || reqUrl.pathname === '/index.html') {
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
    return { status: resp.status, text, json };
}

async function main() {
    const sqlite = new DatabaseSync(':memory:');
    sqlite.exec(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf-8'));

    const env = {
        DB: createD1Adapter(sqlite),
        ASSETS: createAssetsMock(),
    };

    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        const target = typeof url === 'string' ? url : url.url;
        if (target === 'https://id.twitch.tv/oauth2/validate') {
            const auth = init?.headers?.Authorization || '';
            if (auth === 'OAuth token_user1') {
                return new Response(JSON.stringify({
                    client_id: '7i3oa82uoo3e39ovny3p7k079f84n3',
                    login: 'streamer_one',
                    user_id: '11111',
                    expires_in: 3600,
                }), { status: 200 });
            }
            if (auth === 'OAuth token_user2') {
                return new Response(JSON.stringify({
                    client_id: '7i3oa82uoo3e39ovny3p7k079f84n3',
                    login: 'streamer_two',
                    user_id: '22222',
                    expires_in: 3600,
                }), { status: 200 });
            }
            return new Response(JSON.stringify({ status: 401, message: 'invalid access token' }), { status: 401 });
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

        const putCfg = await callWorker('/api/sync/config', env, {
            method: 'PUT',
            headers: { ...auth1, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                settings: { appTitle: 'CloudClipQ', userClipLimit: 3 },
                customDesign: { fontFamily: 'Poppins', colors: { '--color-accent': 'rgba(1,2,3,1)' } },
                language: 'de',
                autoplay: true,
            }),
        });
        assert.equal(putCfg.status, 200);

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

        const exp = await callWorker('/api/sync/export', env, { headers: auth1 });
        assert.equal(exp.status, 200);
        assert.equal(exp.json.history.length, 550);
        assert.equal(exp.json.memory.length, 2);

        await callWorker('/api/sync/history?id=clip_550', env, { method: 'DELETE', headers: auth1 });
        const afterSingleDel = await callWorker('/api/sync?limit=10', env, { headers: auth1 });
        assert.equal(afterSingleDel.json.historyTotal, 549);

        const delAll = await callWorker('/api/sync', env, { method: 'DELETE', headers: auth1 });
        assert.equal(delAll.status, 200);
        const afterPurge = await callWorker('/api/sync', env, { headers: auth1 });
        assert.equal(afterPurge.json.exists, false);
        assert.equal(afterPurge.json.historyTotal, 0);

        console.log(JSON.stringify({ status: 'ok', worker_routes_verified: 16, d1_history_tested: 550 }));
    } finally {
        globalThis.fetch = origFetch;
        sqlite.close();
    }
}

await main();
