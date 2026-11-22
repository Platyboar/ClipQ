/**
 * worker.js — Cloudflare Worker entrypoint for ClipQ static assets, proxies, and D1 sync
 */

import { handleOembed, handleVideoUrl, handleYoutubeMeta, jsonResponse } from './worker/proxy.js';
import { authenticateRequest, handleSyncRequest } from './worker/sync-api.js';
import { handleTwitchMeta } from './worker/twitch-meta.js';
export { ClipQRoom } from './worker/sync-room.js';

const OBS_PATH_RE = /^\/obs(?:\/[^/?#]+)?\/?$/i;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method.toUpperCase();

        if (path === '/health' && method === 'GET') {
            return jsonResponse({ ok: true, sync: Boolean(env?.DB) });
        }
        if (
            (path === '/api/youtube-meta' || path === '/api/oembed' || path === '/api/video-url' || path === '/api/twitch-meta') &&
            method === 'GET'
        ) {
            const identity = await authenticateRequest(request, env);
            if (!identity) {
                return jsonResponse({ error: 'Unauthorized' }, 401);
            }
            if (path === '/api/youtube-meta') return handleYoutubeMeta(url);
            if (path === '/api/oembed') return handleOembed(url);
            if (path === '/api/twitch-meta') return handleTwitchMeta(url, env);
            return handleVideoUrl(url, env);
        }
        if (path === '/api/sync' || path.startsWith('/api/sync/')) {
            return handleSyncRequest(request, url, env);
        }
        if (path.startsWith('/api/')) {
            return jsonResponse({ error: 'Not found' }, 404);
        }

        if (method !== 'GET' && method !== 'HEAD') {
            return jsonResponse({ error: 'Not found' }, 404);
        }

        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404 || path === '/') {
            return assetResponse;
        }

        const baseName = path.split('/').pop() || '';
        if (!baseName.includes('.')) {
            const indexUrl = new URL('/', url.origin);
            const spaResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
            if (OBS_PATH_RE.test(path)) {
                const headers = new Headers(spaResponse.headers);
                headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
                headers.set('Cache-Control', 'no-store');
                return new Response(spaResponse.body, {
                    status: spaResponse.status,
                    statusText: spaResponse.statusText,
                    headers,
                });
            }
            return spaResponse;
        }

        return assetResponse;
    },
};
