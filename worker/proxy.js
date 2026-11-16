/**
 * proxy.js — SSRF-guarded metadata, oEmbed, and optional video URL proxy handlers
 */

const MAX_OEMBED_BYTES = 1048576;
const MAX_HTML_META_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 5;

const ALLOWED_OEMBED_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'tiktok.com',
    'www.tiktok.com',
]);

const ALLOWED_VIDEO_HOSTS = new Set([
    'instagram.com',
    'www.instagram.com',
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
]);

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;

export function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}

function isAllowedOembedUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        return (
            parsed.protocol === 'https:' &&
            ALLOWED_OEMBED_HOSTS.has(parsed.hostname.toLowerCase()) &&
            !parsed.port &&
            parsed.pathname.replace(/\/+$/, '') === '/oembed'
        );
    } catch {
        return false;
    }
}

function normalizeAllowedVideoUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        if (
            (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
            !ALLOWED_VIDEO_HOSTS.has(parsed.hostname.toLowerCase()) ||
            parsed.port
        ) {
            return null;
        }
        parsed.protocol = 'https:';
        return parsed.toString();
    } catch {
        return null;
    }
}

async function readBoundedText(response, maxBytes) {
    if (!response.body) return '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let total = 0;
    let out = '';
    while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        const remaining = maxBytes - total;
        const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
        total += chunk.byteLength;
        out += decoder.decode(chunk, { stream: true });
        if (total >= maxBytes) {
            await reader.cancel();
            break;
        }
    }
    out += decoder.decode();
    return out;
}

export async function handleYoutubeMeta(reqUrl) {
    const videoId = reqUrl.searchParams.get('id');
    if (!videoId || !YOUTUBE_ID_RE.test(videoId)) {
        return jsonResponse({ error: 'Invalid or missing id parameter' }, 400);
    }
    try {
        const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478',
            },
            signal: AbortSignal.timeout(5000),
        });
        const html = await readBoundedText(resp, MAX_HTML_META_BYTES);
        const match = html.match(/itemprop="datePublished" content="([^"]+)"/);
        return jsonResponse({ createdAt: match ? match[1] : '' });
    } catch (err) {
        return jsonResponse({ error: err?.message || 'Fetch failed' }, 500);
    }
}

export async function handleOembed(reqUrl) {
    const targetUrl = reqUrl.searchParams.get('url');
    if (!targetUrl) {
        return jsonResponse({ error: 'Missing url parameter' }, 400);
    }
    if (!isAllowedOembedUrl(targetUrl)) {
        return jsonResponse({ error: 'Unsupported oEmbed URL' }, 403);
    }
    try {
        let currentUrl = targetUrl;
        let resp = null;
        for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
            resp = await fetch(currentUrl, {
                headers: { 'User-Agent': 'ClipQ/1.0' },
                redirect: 'manual',
                signal: AbortSignal.timeout(5000),
            });
            if (resp.status >= 300 && resp.status < 400) {
                const location = resp.headers.get('location');
                if (!location) break;
                const resolved = new URL(location, currentUrl).toString();
                if (!isAllowedOembedUrl(resolved)) {
                    return jsonResponse({ error: 'Blocked unsafe redirect' }, 403);
                }
                currentUrl = resolved;
                continue;
            }
            break;
        }
        if (!resp || !resp.ok) {
            return jsonResponse({ error: `Upstream HTTP ${resp ? resp.status : 502}` }, 502);
        }
        const text = await readBoundedText(resp, MAX_OEMBED_BYTES);
        return new Response(text, {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    } catch (err) {
        return jsonResponse({ error: err?.message || 'oEmbed fetch failed' }, 500);
    }
}

export async function handleVideoUrl(reqUrl, env) {
    const rawUrl = reqUrl.searchParams.get('url');
    if (!rawUrl) {
        return jsonResponse({ error: 'Missing url parameter' }, 400);
    }
    const safeUrl = normalizeAllowedVideoUrl(rawUrl);
    if (!safeUrl) {
        return jsonResponse({ error: 'Unsupported video URL' }, 403);
    }

    const proxyBase = typeof env?.YTDLP_PROXY_URL === 'string'
        ? env.YTDLP_PROXY_URL.trim().replace(/\/+$/, '')
        : '';
    if (!proxyBase) {
        return jsonResponse({ url: null });
    }

    try {
        const upstream = `${proxyBase}/api/video-url?url=${encodeURIComponent(safeUrl)}`;
        const headers = { 'User-Agent': 'ClipQ/1.0' };
        if (env.YTDLP_PROXY_SECRET) {
            headers['X-ClipQ-Proxy-Secret'] = env.YTDLP_PROXY_SECRET;
        }
        const resp = await fetch(upstream, {
            headers,
            signal: AbortSignal.timeout(12000),
        });
        if (!resp.ok) {
            return jsonResponse({ url: null });
        }
        const data = await resp.json();
        return jsonResponse(data && typeof data === 'object' ? data : { url: null });
    } catch {
        return jsonResponse({ url: null });
    }
}
