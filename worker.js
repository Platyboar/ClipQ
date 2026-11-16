/**
 * worker.js — Cloudflare Worker entrypoint for ClipQ static assets, proxies, and D1 sync
 */

import { handleOembed, handleVideoUrl, handleYoutubeMeta, jsonResponse } from './worker/proxy.js';
import { handleSyncRequest } from './worker/sync-api.js';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method.toUpperCase();

        if (path === '/health' && method === 'GET') {
            return jsonResponse({ ok: true, sync: Boolean(env?.DB) });
        }
        if (path === '/api/youtube-meta' && method === 'GET') {
            return handleYoutubeMeta(url);
        }
        if (path === '/api/oembed' && method === 'GET') {
            return handleOembed(url);
        }
        if (path === '/api/video-url' && method === 'GET') {
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
            const indexUrl = new URL('/index.html', url.origin);
            return env.ASSETS.fetch(new Request(indexUrl, request));
        }

        return assetResponse;
    },
};
