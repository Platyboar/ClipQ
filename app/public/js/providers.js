/**
 * providers.js — URL detection and embed logic for all supported platforms
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Providers = (() => {
    'use strict';

    function getEmbedParent() {
        return encodeURIComponent(window.location.hostname || 'localhost');
    }

    function parseDurationSeconds(dur) {
        if (typeof dur === 'number' && !Number.isNaN(dur)) return dur;
        if (!dur || typeof dur !== 'string') return 0;
        const trimmed = dur.trim();
        if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
        const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/i);
        if (!match || !match[0]) return 0;
        const h = parseInt(match[1] || '0', 10);
        const m = parseInt(match[2] || '0', 10);
        const s = parseFloat(match[3] || '0');
        return h * 3600 + m * 60 + s;
    }

    async function twitchFetchStatus(endpoint, token) {
        const res = await fetch(`https://api.twitch.tv/helix/${endpoint}`, {
            headers: {
                'Client-ID': ClipQ.CLIENT_ID,
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) return { ok: false, status: res.status, data: null };
        const data = await res.json();
        return { ok: true, status: res.status, data };
    }

    async function twitchFetchJson(endpoint, token) {
        const res = await twitchFetchStatus(endpoint, token);
        return res.ok ? res.data : null;
    }

    async function fetchTwitchMetaProxy(type, id) {
        if (!ClipQ.Auth?.getActiveObsKey?.()) return null;
        try {
            const res = await ClipQ.fetchWithAuth(`/api/twitch-meta?type=${type}&id=${encodeURIComponent(id)}`);
            return res.ok ? await res.json() : null;
        } catch { return null; }
    }

    async function fetchTwitchBroadcaster(userId, token) {
        if (!userId) return { avatarUrl: '', login: '' };
        try {
            const data = await twitchFetchJson(`users?id=${encodeURIComponent(userId)}`, token);
            const user = data?.data?.[0];
            return { avatarUrl: user?.profile_image_url || '', login: (user?.login || '').toLowerCase() };
        } catch { return { avatarUrl: '', login: '' }; }
    }

    const IG_RESERVED_PATHS = new Set(['reel', 'reels', 'p', 'tv', 'share', 'explore', 'stories', 'accounts', 'direct', 'about', 'legal', 'developer']);

    function matchFirstPattern(patterns, url) {
        for (const p of patterns) {
            const m = url.match(p);
            if (m) return m[1];
        }
        return null;
    }

    function extractInstagramHandle(url) {
        const m = (url || '').match(/instagram\.com\/([A-Za-z0-9._]+)\/(?:reel|reels|p|tv)\/[A-Za-z0-9_-]+/i);
        return m && !IG_RESERVED_PATHS.has(m[1].toLowerCase()) ? m[1] : '';
    }

    function formatIgProfileUrl(rawHandle) {
        const h = (rawHandle || '').replace(/^@/, '').trim();
        if (!h || h.toLowerCase() === 'instagram' || IG_RESERVED_PATHS.has(h.toLowerCase()) || !/^[A-Za-z0-9._]+$/.test(h)) {
            return '';
        }
        return `https://www.instagram.com/${encodeURIComponent(h)}/`;
    }

    function resolveInstagramAuthor(data, existingUrl = '', fallbackUrl = '') {
        const direct = ClipQ.sanitizeUrl(data?.uploader_url || data?.channel_url || existingUrl);
        if (direct) {
            const profileMatch = direct.match(/instagram\.com\/([A-Za-z0-9._]+)\/?(?:$|[?#])/i);
            if (profileMatch && !IG_RESERVED_PATHS.has(profileMatch[1].toLowerCase())) return direct;
        }
        const titleMatch = (data?.title || '').match(/^(?:Video|Post|Story) by ([A-Za-z0-9._]+)$/i);
        return (
            formatIgProfileUrl(data?.channel || data?.uploader) ||
            formatIgProfileUrl(extractInstagramHandle(data?.webpage_url || fallbackUrl || existingUrl)) ||
            formatIgProfileUrl(titleMatch ? titleMatch[1] : '')
        );
    }

    const PROVIDERS = {
        twitch: {
            name: 'Twitch Clips',
            patterns: [
                /(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/(\w+)\/clip\/([A-Za-z0-9_-]+)/i,
                /(?:https?:\/\/)?clips\.twitch\.tv\/(?:create\/)?(?!(?:create|embed)(?:[/?#]|$))([A-Za-z0-9_-]+)/i
            ],
            extractId(url) {
                for (const p of this.patterns) {
                    const m = url.match(p);
                    if (m) return m[2] || m[1];
                }
                return null;
            },
            extractChannel(url) {
                const m = url.match(/twitch\.tv\/(\w+)\/clip\//i);
                return m ? m[1].toLowerCase() : null;
            },
            getEmbedUrl(id) {
                return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(id)}&parent=${getEmbedParent()}&autoplay=true&muted=false`;
            },
            async isClipAvailable(id, token) {
                if (!id) return true;
                try {
                    if (!token) {
                        const proxyRes = await fetchTwitchMetaProxy('clip', id);
                        return proxyRes ? proxyRes.available !== false : true;
                    }
                    const res = await twitchFetchStatus(`clips?id=${encodeURIComponent(id)}`, token);
                    return !res.ok || (Array.isArray(res.data?.data) && res.data.data.length > 0);
                } catch { return true; }
            },
            async fetchMeta(id, token) {
                try {
                    if (!token) {
                        const proxyRes = await fetchTwitchMetaProxy('clip', id);
                        return proxyRes?.unavailable ? { unavailable: true } : (proxyRes?.meta || null);
                    }
                    const res = await twitchFetchStatus(`clips?id=${encodeURIComponent(id)}`, token);
                    if (!res.ok) return null;
                    const clip = res.data?.data?.[0];
                    if (!clip) return { unavailable: true };

                    const broadcaster = await fetchTwitchBroadcaster(clip.broadcaster_id, token);
                    let gameName = '';
                    if (clip.game_id) {
                        try {
                            const gData = await twitchFetchJson(`games?id=${encodeURIComponent(clip.game_id)}`, token);
                            gameName = gData?.data?.[0]?.name || '';
                        } catch { /* ignore */ }
                    }

                    const canonicalUrl = broadcaster.login
                        ? `https://www.twitch.tv/${encodeURIComponent(broadcaster.login)}/clip/${encodeURIComponent(id)}`
                        : '';

                    return {
                        title: clip.title,
                        channel: clip.broadcaster_name,
                        avatarUrl: broadcaster.avatarUrl,
                        category: gameName,
                        creator: clip.creator_name,
                        createdAt: clip.created_at,
                        thumbnail: clip.thumbnail_url,
                        duration: parseDurationSeconds(clip.duration),
                        viewCount: clip.view_count,
                        canonicalUrl
                    };
                } catch (e) {
                    console.error('Twitch clip fetch error:', e);
                    return null;
                }
            }
        },

        twitch_vod: {
            name: 'Twitch VOD',
            patterns: [
                /(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/videos\/(\d+)/i
            ],
            extractId(url) {
                const m = url.match(/(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/videos\/(\d+)/i);
                return m ? m[1] : null;
            },
            extractTime(url) {
                const m = url.match(/[?&]t=([A-Za-z0-9_]+)/i);
                return m ? m[1] : null;
            },
            getEmbedUrl(id, originalUrl) {
                const time = this.extractTime(originalUrl || '');
                let embed = `https://player.twitch.tv/?video=v${encodeURIComponent(id)}&parent=${getEmbedParent()}&autoplay=true&muted=false`;
                if (time) embed += `&time=${encodeURIComponent(time)}`;
                return embed;
            },
            async fetchMeta(id, token) {
                try {
                    if (!token) return (await fetchTwitchMetaProxy('vod', id))?.meta || null;
                    const data = await twitchFetchJson(`videos?id=${encodeURIComponent(id)}`, token);
                    const video = data?.data?.[0];
                    if (!video) return null;

                    const broadcaster = await fetchTwitchBroadcaster(video.user_id, token);

                    return {
                        title: video.title,
                        channel: video.user_name,
                        avatarUrl: broadcaster.avatarUrl,
                        category: 'Twitch VOD',
                        creator: video.user_name,
                        createdAt: video.created_at,
                        thumbnail: video.thumbnail_url.replace('%{width}', '320').replace('%{height}', '180'),
                        duration: parseDurationSeconds(video.duration)
                    };
                } catch (e) {
                    console.error('Twitch VOD fetch error:', e);
                    return null;
                }
            }
        },

        youtube: {
            name: 'YouTube',
            patterns: [
                /(?:https?:\/\/)?(?:(?:www|m|music)\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([A-Za-z0-9_-]+)/i,
                /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]+)/i,
                /(?:https?:\/\/)?(?:(?:www|m)\.)?youtube\.com\/(?:shorts|live)\/([A-Za-z0-9_-]+)/i
            ],
            extractId(url) { return matchFirstPattern(this.patterns, url); },
            getEmbedUrl(id) { return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1`; },
            async fetchMeta(id) {
                const fallback = {
                    title: 'YouTube Video',
                    channel: 'YouTube',
                    authorUrl: '',
                    avatarUrl: '',
                    category: 'YouTube',
                    creator: '',
                    createdAt: null,
                    thumbnail: `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
                    duration: 0
                };
                try {
                    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}&format=json`;
                    const res = await ClipQ.fetchWithAuth(`/api/oembed?url=${encodeURIComponent(oembedUrl)}`);
                    if (!res.ok) return fallback;
                    const data = await res.json();

                    let createdAt = null;
                    try {
                        const metaRes = await ClipQ.fetchWithAuth(`/api/youtube-meta?id=${encodeURIComponent(id)}`);
                        if (metaRes.ok) {
                            const metaData = await metaRes.json();
                            if (metaData.createdAt) createdAt = metaData.createdAt;
                        }
                    } catch (e) {
                        console.warn('Could not fetch YouTube meta', e);
                    }

                    return {
                        ...fallback,
                        title: data.title || fallback.title,
                        channel: data.author_name || fallback.channel,
                        authorUrl: data.author_url || '',
                        createdAt
                    };
                } catch {
                    return fallback;
                }
            }
        },

        tiktok: {
            name: 'TikTok',
            patterns: [
                /(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
                /(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]+)/i,
                /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/([A-Za-z0-9]+)/i
            ],
            extractId(url) { return matchFirstPattern(this.patterns, url); },
            extractChannel(url) {
                const m = (url || '').match(/tiktok\.com\/@([\w.-]+)\/video\/\d+/i);
                return m ? m[1].toLowerCase() : null;
            },
            getEmbedUrl(id) {
                return `https://www.tiktok.com/player/v1/${encodeURIComponent(id)}?autoplay=1&controls=1&description=0&music_info=0&rel=0&loop=0`;
            },
            async fetchMeta(id, token, originalUrl) {
                const handleMatch = (originalUrl || '').match(/tiktok\.com\/@([\w.-]+)(?:\/video\/(\d+))?/i);
                const urlHandle = handleMatch ? handleMatch[1] : '';
                const result = {
                    title: 'TikTok',
                    channel: urlHandle ? `@${urlHandle}` : 'TikTok',
                    authorUrl: urlHandle ? `https://www.tiktok.com/@${encodeURIComponent(urlHandle)}` : '',
                    avatarUrl: '',
                    category: 'TikTok',
                    creator: urlHandle ? `@${urlHandle}` : '',
                    createdAt: null,
                    thumbnail: '',
                    duration: 0,
                    resolvedId: /^\d+$/.test(id) ? id : null,
                    canonicalUrl: ''
                };

                const targetUrl = (originalUrl || `https://www.tiktok.com/video/${id}`).replace(/^http:\/\//i, 'https://');
                try {
                    const res = await ClipQ.fetchWithAuth(`/api/video-url?url=${encodeURIComponent(targetUrl)}`);
                    if (res.ok) {
                        const data = await res.json();
                        const handle = (data.uploader || urlHandle || '').replace(/^@/, '');
                        const uploaderUrl = ClipQ.sanitizeUrl(data.uploader_url);
                        if (data.title) result.title = data.title;
                        if (data.channel || handle) {
                            result.channel = data.channel || `@${handle}`;
                            result.creator = result.channel;
                        }
                        if (uploaderUrl && /tiktok\.com\/@/i.test(uploaderUrl) && !/\/@MS4wLjAB/i.test(uploaderUrl)) {
                            result.authorUrl = uploaderUrl;
                        } else if (handle) {
                            result.authorUrl = `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
                        }
                        if (data.thumbnail) result.thumbnail = data.thumbnail;
                        if (data.duration) result.duration = parseDurationSeconds(data.duration);
                        if (data.id && /^\d+$/.test(String(data.id))) {
                            result.resolvedId = String(data.id);
                        }
                        const webMatch = typeof data.webpage_url === 'string'
                            ? data.webpage_url.match(/tiktok\.com\/(@[\w.-]+)\/video\/(\d+)/i)
                            : null;
                        if (webMatch) {
                            result.canonicalUrl = `https://www.tiktok.com/${webMatch[1]}/video/${webMatch[2]}`;
                            result.resolvedId = result.resolvedId || webMatch[2];
                            if (!result.authorUrl) result.authorUrl = `https://www.tiktok.com/${webMatch[1]}`;
                        } else if (handle && result.resolvedId) {
                            result.canonicalUrl = `https://www.tiktok.com/@${encodeURIComponent(handle)}/video/${result.resolvedId}`;
                        }
                    }
                } catch { /* ignore yt-dlp failure and try oEmbed */ }

                if (result.title !== 'TikTok' && result.authorUrl && result.thumbnail && result.resolvedId) {
                    return result;
                }

                try {
                    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`;
                    const res = await ClipQ.fetchWithAuth(`/api/oembed?url=${encodeURIComponent(oembedUrl)}`);
                    if (!res.ok) return result;
                    const data = await res.json();

                    if (!result.resolvedId && data.embed_product_id && /^\d+$/.test(String(data.embed_product_id))) {
                        result.resolvedId = String(data.embed_product_id);
                    }
                    if (!result.resolvedId && typeof data.html === 'string') {
                        const idMatch = data.html.match(/data-video-id="(\d+)"/) || data.html.match(/\/video\/(\d+)/);
                        if (idMatch) result.resolvedId = idMatch[1];
                    }
                    if (result.title === 'TikTok' && data.title) result.title = data.title;
                    if (result.channel === 'TikTok' && data.author_name) {
                        result.channel = data.author_name;
                        result.creator = data.author_name;
                    }
                    if (!result.authorUrl && data.author_url) {
                        result.authorUrl = ClipQ.sanitizeUrl(data.author_url);
                    }
                    if (!result.thumbnail && data.thumbnail_url) result.thumbnail = data.thumbnail_url;
                } catch { /* keep partial/fallback metadata */ }

                return result;
            }
        },

        instagram: {
            name: 'Instagram',
            patterns: [
                /(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/(?:[A-Za-z0-9._]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i
            ],
            extractId(url) {
                return matchFirstPattern(this.patterns, url);
            },
            extractChannel(url) {
                const handle = extractInstagramHandle(url);
                return handle ? handle.toLowerCase() : null;
            },
            getEmbedUrl(id) {
                return `https://www.instagram.com/p/${encodeURIComponent(id)}/embed/?autoplay=1`;
            },
            async fetchMeta(id, token, originalUrl) {
                const urlHandle = extractInstagramHandle(originalUrl);
                const meta = {
                    title: 'Instagram Reel',
                    channel: urlHandle || 'Instagram',
                    authorUrl: formatIgProfileUrl(urlHandle),
                    avatarUrl: '',
                    category: 'Instagram',
                    creator: urlHandle || '',
                    createdAt: null,
                    thumbnail: '',
                    duration: 0
                };
                try {
                    const videoUrl = (originalUrl || `https://www.instagram.com/p/${id}/`).replace(/^http:\/\//i, 'https://');
                    const res = await ClipQ.fetchWithAuth(`/api/video-url?url=${encodeURIComponent(videoUrl)}`);
                    if (res.ok) {
                        const data = await res.json();
                        const display = data.uploader || data.channel || meta.channel;
                        Object.assign(meta, {
                            title: data.title || meta.title,
                            channel: display,
                            authorUrl: resolveInstagramAuthor(data, meta.authorUrl, originalUrl) || meta.authorUrl,
                            creator: data.uploader || data.channel || meta.creator,
                            thumbnail: data.thumbnail || '',
                            duration: parseDurationSeconds(data.duration),
                            directUrl: data.url || '',
                            directUrlFetchedAt: data.url ? Date.now() : 0
                        });
                    }
                } catch (e) {
                    console.warn('Instagram fetchMeta failed, using fallback', e);
                }
                return meta;
            }
        }
    };

    /**
     * Build a clean canonical external URL for a clip so trailing share text or query junk is removed.
     */
    function getCanonicalUrl(providerKey, id, rawUrl) {
        const source = typeof rawUrl === 'string' ? rawUrl.trim() : '';
        const provider = PROVIDERS[providerKey];
        const clipId = id || (provider ? provider.extractId(source) : null);
        if (!clipId) return source;

        if (providerKey === 'twitch') {
            const channelMatch = source.match(/(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/(\w+)\/clip\/([A-Za-z0-9_-]+)/i);
            return channelMatch ? `https://www.twitch.tv/${channelMatch[1]}/clip/${channelMatch[2]}` : `https://clips.twitch.tv/${clipId}`;
        }

        if (providerKey === 'twitch_vod') {
            const timeMatch = source.match(/[?&]t=([A-Za-z0-9_]+)/i);
            return `https://www.twitch.tv/videos/${clipId}${timeMatch ? `?t=${timeMatch[1]}` : ''}`;
        }

        if (providerKey === 'youtube') {
            if (/youtube\.com\/shorts\//i.test(source)) return `https://www.youtube.com/shorts/${clipId}`;
            if (/youtube\.com\/live\//i.test(source)) return `https://www.youtube.com/live/${clipId}`;
            return `https://www.youtube.com/watch?v=${clipId}`;
        }

        if (providerKey === 'tiktok') {
            const fullMatch = source.match(/tiktok\.com\/(@[\w.-]+)\/video\/(\d+)/i);
            if (fullMatch) return `https://www.tiktok.com/${fullMatch[1]}/video/${fullMatch[2]}`;
            const shortHostMatch = source.match(/(?:https?:\/\/)?((?:vm|vt)\.tiktok\.com)\/([A-Za-z0-9]+)/i);
            if (shortHostMatch) return `https://${shortHostMatch[1].toLowerCase()}/${shortHostMatch[2]}`;
            const shortPathMatch = source.match(/tiktok\.com\/t\/([A-Za-z0-9]+)/i);
            return shortPathMatch ? `https://www.tiktok.com/t/${shortPathMatch[1]}` : source;
        }

        if (providerKey === 'instagram') {
            const igMatch = source.match(/instagram\.com\/(?:[A-Za-z0-9._]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i);
            const urlHandle = extractInstagramHandle(source);
            return `https://www.instagram.com/${urlHandle ? `${urlHandle}/` : ''}${igMatch ? igMatch[1].toLowerCase() : 'reel'}/${clipId}/`;
        }

        return source;
    }

    /**
     * Parse a message and find the first valid clip URL.
     * If enabledProviders is omitted, all providers are checked.
     */
    function parseClipUrl(message, enabledProviders) {
        const urlRegex = /https?:\/\/[^\s]+/gi;
        const urls = message.match(urlRegex);
        if (!urls) return null;

        for (const rawUrl of urls) {
            const cleanedRaw = rawUrl.trim().replace(/[),.!?;:'">\]}]+$/, '');
            for (const [key, provider] of Object.entries(PROVIDERS)) {
                if (enabledProviders && !enabledProviders[key]) continue;
                const id = provider.extractId(cleanedRaw);
                if (id) {
                    const channelName = provider.extractChannel ? provider.extractChannel(cleanedRaw) : null;
                    const url = getCanonicalUrl(key, id, cleanedRaw);
                    return { provider: key, id, url, providerName: provider.name, channelName };
                }
            }
        }
        return null;
    }

    function getProvider(key) {
        return PROVIDERS[key] || null;
    }

    return { parseClipUrl, getProvider, getCanonicalUrl, parseDurationSeconds, resolveInstagramAuthor };
})();
