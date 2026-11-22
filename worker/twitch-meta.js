/**
 * twitch-meta.js — Server-side Twitch Helix metadata lookup via App Access Token
 */

import { jsonResponse } from './proxy.js';

const DEFAULT_TWITCH_CLIENT_ID = '7i3oa82uoo3e39ovny3p7k079f84n3';
const CLIP_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const VOD_ID_RE = /^\d{1,32}$/;

let appTokenCache = {
    cacheKey: '',
    token: '',
    expiresAt: 0,
};

function parseDurationSeconds(dur) {
    if (typeof dur === 'number' && !Number.isNaN(dur)) return dur;
    if (!dur || typeof dur !== 'string') return 0;
    const trimmed = dur.trim();
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
    const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/i);
    if (!match || !match[0]) return 0;
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseFloat(match[3] || '0');
    return h * 3600 + m * 60 + s;
}

async function getAppAccessToken(clientId, clientSecret) {
    const cacheKey = `${clientId}:${clientSecret}`;
    const now = Date.now();
    if (appTokenCache.cacheKey === cacheKey && appTokenCache.token && appTokenCache.expiresAt > now + 60000) {
        return appTokenCache.token;
    }

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
    });
    const resp = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
        return null;
    }
    const data = await resp.json();
    if (!data?.access_token) {
        return null;
    }
    const ttlMs = Math.max(60000, Number(data.expires_in || 3600) * 1000);
    appTokenCache = {
        cacheKey,
        token: data.access_token,
        expiresAt: now + ttlMs,
    };
    return data.access_token;
}

async function helixGet(endpoint, clientId, clientSecret, retried = false) {
    const appToken = await getAppAccessToken(clientId, clientSecret);
    if (!appToken) return { ok: false, status: 502, data: null };

    const resp = await fetch(`https://api.twitch.tv/helix/${endpoint}`, {
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${appToken}`,
        },
        signal: AbortSignal.timeout(5000),
    });
    if (resp.status === 401 && !retried) {
        appTokenCache = { cacheKey: '', token: '', expiresAt: 0 };
        return helixGet(endpoint, clientId, clientSecret, true);
    }
    if (!resp.ok) {
        return { ok: false, status: resp.status, data: null };
    }
    return { ok: true, status: resp.status, data: await resp.json() };
}

async function fetchBroadcaster(userId, clientId, clientSecret) {
    if (!userId) return { avatarUrl: '', login: '' };
    const res = await helixGet(`users?id=${encodeURIComponent(userId)}`, clientId, clientSecret);
    const user = res.ok ? res.data?.data?.[0] : null;
    return {
        avatarUrl: user?.profile_image_url || '',
        login: (user?.login || '').toLowerCase(),
    };
}

async function fetchGameName(gameId, clientId, clientSecret) {
    if (!gameId) return '';
    const res = await helixGet(`games?id=${encodeURIComponent(gameId)}`, clientId, clientSecret);
    return res.ok ? (res.data?.data?.[0]?.name || '') : '';
}

function mapBadgeSets(badgeSets) {
    const out = {};
    if (!Array.isArray(badgeSets)) return out;
    for (const badgeSet of badgeSets) {
        if (!badgeSet?.set_id || !Array.isArray(badgeSet.versions)) continue;
        const versions = {};
        for (const ver of badgeSet.versions) {
            if (!ver?.id || !ver?.image_url_1x) continue;
            versions[String(ver.id)] = {
                url: ver.image_url_2x || ver.image_url_1x,
                title: ver.title || badgeSet.set_id,
            };
        }
        out[String(badgeSet.set_id)] = versions;
    }
    return out;
}

export async function handleTwitchMeta(reqUrl, env) {
    const type = (reqUrl.searchParams.get('type') || '').trim().toLowerCase();
    const id = (reqUrl.searchParams.get('id') || '').trim();
    if (type === 'clip' && !CLIP_ID_RE.test(id)) {
        return jsonResponse({ error: 'Invalid or missing clip id' }, 400);
    }
    if ((type === 'vod' || type === 'badges') && !VOD_ID_RE.test(id)) {
        return jsonResponse({ error: `Invalid or missing ${type} id` }, 400);
    }
    if (type !== 'clip' && type !== 'vod' && type !== 'badges') {
        return jsonResponse({ error: 'Invalid type parameter' }, 400);
    }

    const clientSecret = typeof env?.TWITCH_CLIENT_SECRET === 'string' ? env.TWITCH_CLIENT_SECRET.trim() : '';
    if (!clientSecret) {
        if (type === 'badges') return jsonResponse({ configured: false, badges: null });
        return jsonResponse({ configured: false, available: true, meta: null });
    }
    const clientId = (env?.TWITCH_CLIENT_ID || DEFAULT_TWITCH_CLIENT_ID).trim();

    try {
        if (type === 'badges') {
            const [globalRes, channelRes] = await Promise.all([
                helixGet('chat/badges/global', clientId, clientSecret),
                helixGet(`chat/badges?broadcaster_id=${encodeURIComponent(id)}`, clientId, clientSecret),
            ]);
            if (!globalRes.ok && !channelRes.ok) {
                return jsonResponse({ error: 'Twitch badges fetch failed' }, 502);
            }
            const badges = {
                ...mapBadgeSets(globalRes.ok ? globalRes.data?.data : []),
                ...mapBadgeSets(channelRes.ok ? channelRes.data?.data : []),
            };
            return jsonResponse({ configured: true, badges });
        }
        if (type === 'clip') {
            const clipRes = await helixGet(`clips?id=${encodeURIComponent(id)}`, clientId, clientSecret);
            if (!clipRes.ok) {
                return jsonResponse({ error: `Twitch HTTP ${clipRes.status}` }, 502);
            }
            const clip = clipRes.data?.data?.[0];
            if (!clip) {
                return jsonResponse({ configured: true, available: false, unavailable: true, meta: null });
            }
            const [broadcaster, gameName] = await Promise.all([
                fetchBroadcaster(clip.broadcaster_id, clientId, clientSecret),
                fetchGameName(clip.game_id, clientId, clientSecret),
            ]);
            const canonicalUrl = broadcaster.login
                ? `https://www.twitch.tv/${encodeURIComponent(broadcaster.login)}/clip/${encodeURIComponent(id)}`
                : '';
            return jsonResponse({
                configured: true,
                available: true,
                unavailable: false,
                meta: {
                    title: clip.title,
                    channel: clip.broadcaster_name,
                    avatarUrl: broadcaster.avatarUrl,
                    category: gameName,
                    creator: clip.creator_name,
                    createdAt: clip.created_at,
                    thumbnail: clip.thumbnail_url,
                    duration: parseDurationSeconds(clip.duration),
                    viewCount: clip.view_count,
                    canonicalUrl,
                },
            });
        }

        const vodRes = await helixGet(`videos?id=${encodeURIComponent(id)}`, clientId, clientSecret);
        if (!vodRes.ok) {
            return jsonResponse({ error: `Twitch HTTP ${vodRes.status}` }, 502);
        }
        const video = vodRes.data?.data?.[0];
        if (!video) {
            return jsonResponse({ configured: true, available: false, unavailable: true, meta: null });
        }
        const broadcaster = await fetchBroadcaster(video.user_id, clientId, clientSecret);
        return jsonResponse({
            configured: true,
            available: true,
            unavailable: false,
            meta: {
                title: video.title,
                channel: video.user_name,
                avatarUrl: broadcaster.avatarUrl,
                category: 'Twitch VOD',
                creator: video.user_name,
                createdAt: video.created_at,
                thumbnail: (video.thumbnail_url || '').replace('%{width}', '320').replace('%{height}', '180'),
                duration: parseDurationSeconds(video.duration),
            },
        });
    } catch (err) {
        return jsonResponse({ error: err?.message || 'Twitch meta fetch failed' }, 500);
    }
}
