/**
 * providers.js — URL detection and embed logic for all supported platforms
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Providers = (() => {
    const PROVIDERS = {
        twitch: {
            name: 'Twitch',
            patterns: [
                /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/(\w+)\/clip\/([A-Za-z0-9_-]+)/,
                /(?:https?:\/\/)?clips\.twitch\.tv\/([A-Za-z0-9_-]+)/
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
                return `https://clips.twitch.tv/embed?clip=${id}&parent=localhost&autoplay=true&muted=false`;
            },
            async fetchMeta(id, token) {
                try {
                    const res = await fetch(`https://api.twitch.tv/helix/clips?id=${id}`, {
                        headers: {
                            'Client-ID': ClipQ.CLIENT_ID,
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (!data.data || !data.data[0]) return null;
                    const clip = data.data[0];

                    // Fetch broadcaster avatar
                    let avatarUrl = '';
                    try {
                        const uRes = await fetch(`https://api.twitch.tv/helix/users?id=${clip.broadcaster_id}`, {
                            headers: { 'Client-ID': ClipQ.CLIENT_ID, 'Authorization': `Bearer ${token}` }
                        });
                        const uData = await uRes.json();
                        if (uData.data && uData.data[0]) avatarUrl = uData.data[0].profile_image_url;
                    } catch (e) { /* ignore */ }

                    // Fetch game name
                    let gameName = '';
                    if (clip.game_id) {
                        try {
                            const gRes = await fetch(`https://api.twitch.tv/helix/games?id=${clip.game_id}`, {
                                headers: { 'Client-ID': ClipQ.CLIENT_ID, 'Authorization': `Bearer ${token}` }
                            });
                            const gData = await gRes.json();
                            if (gData.data && gData.data[0]) gameName = gData.data[0].name;
                        } catch (e) { /* ignore */ }
                    }

                    return {
                        title: clip.title,
                        channel: clip.broadcaster_name,
                        avatarUrl,
                        category: gameName,
                        creator: clip.creator_name,
                        createdAt: clip.created_at,
                        thumbnail: clip.thumbnail_url,
                        duration: clip.duration,
                        viewCount: clip.view_count
                    };
                } catch (e) {
                    console.error('Twitch clip fetch error:', e);
                    return null;
                }
            }
        },

        youtube: {
            name: 'YouTube',
            patterns: [
                /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]+)/,
                /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]+)/,
                /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]+)/
            ],
            extractId(url) {
                for (const p of this.patterns) {
                    const m = url.match(p);
                    if (m) return m[1];
                }
                return null;
            },
            getEmbedUrl(id) {
                return `https://www.youtube.com/embed/${id}?autoplay=1`;
            },
            async fetchMeta(id) {
                try {
                    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
                    const res = await fetch(`/api/oembed?url=${encodeURIComponent(oembedUrl)}`);
                    const data = await res.json();
                    
                    let createdAt = null;
                    try {
                        const metaRes = await fetch(`/api/youtube-meta?id=${id}`);
                        if (metaRes.ok) {
                            const metaData = await metaRes.json();
                            if (metaData.createdAt) createdAt = metaData.createdAt;
                        }
                    } catch(e) {
                        console.warn('Could not fetch YouTube meta', e);
                    }

                    return {
                        title: data.title || 'YouTube Video',
                        channel: data.author_name || 'YouTube',
                        authorUrl: data.author_url || '',
                        avatarUrl: '',
                        category: 'YouTube',
                        creator: '',
                        createdAt: createdAt,
                        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                        duration: 0
                    };
                } catch (e) {
                    return { title: 'YouTube Video', channel: 'YouTube', authorUrl: '', avatarUrl: '', category: 'YouTube', creator: '', createdAt: null, thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`, duration: 0 };
                }
            }
        },


        tiktok: {
            name: 'TikTok',
            patterns: [
                /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.]+\/video\/(\d+)/,
                /(?:https?:\/\/)?vm\.tiktok\.com\/([A-Za-z0-9]+)/
            ],
            extractId(url) {
                for (const p of this.patterns) {
                    const m = url.match(p);
                    if (m) return m[1];
                }
                return null;
            },
            getEmbedUrl(id) {
                return `https://www.tiktok.com/embed/v2/${id}?theme=dark`;
            },
            async fetchMeta(id, token, originalUrl) {
                try {
                    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(originalUrl || `https://www.tiktok.com/video/${id}`)}`;
                    const res = await fetch(`/api/oembed?url=${encodeURIComponent(oembedUrl)}`);
                    const data = await res.json();
                    return { title: data.title || 'TikTok', channel: data.author_name || 'TikTok', avatarUrl: '', category: 'TikTok', creator: data.author_name || '', createdAt: null, thumbnail: data.thumbnail_url || '', duration: 0 };
                } catch (e) {
                    return { title: 'TikTok', channel: 'TikTok', avatarUrl: '', category: 'TikTok', creator: '', createdAt: null, thumbnail: '', duration: 0 };
                }
            }
        },

        instagram: {
            name: 'Instagram',
            patterns: [
                /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/
            ],
            extractId(url) {
                for (const p of this.patterns) {
                    const m = url.match(p);
                    if (m) return m[1];
                }
                return null;
            },
            getEmbedUrl(id) {
                return `https://www.instagram.com/p/${id}/embed/?autoplay=1`;
            },
            async fetchMeta(id, token, originalUrl) {
                try {
                    const videoUrl = originalUrl || `https://www.instagram.com/p/${id}/`;
                    const res = await fetch(`/api/video-url?url=${encodeURIComponent(videoUrl)}`);
                    if (res.ok) {
                        const data = await res.json();
                        return {
                            title: data.title || 'Instagram Reel',
                            channel: data.uploader || 'Instagram',
                            avatarUrl: '',
                            category: 'Instagram',
                            creator: data.uploader || '',
                            createdAt: null,
                            thumbnail: data.thumbnail || '',
                            duration: data.duration || 0
                        };
                    }
                } catch (e) {
                    console.warn('Instagram fetchMeta failed, using fallback', e);
                }
                // Fallback — if API is not working or fails
                return {
                    title: 'Instagram Reel',
                    channel: 'Instagram',
                    avatarUrl: '',
                    category: 'Instagram',
                    creator: '',
                    createdAt: null,
                    thumbnail: '',
                    duration: 0
                };
            }
        }
    };

    /**
     * Parse a message and find the first valid clip URL.
     * Returns { provider, id, url } or null.
     */
    function parseClipUrl(message, enabledProviders) {
        const urlRegex = /https?:\/\/[^\s]+/gi;
        const urls = message.match(urlRegex);
        if (!urls) return null;

        for (const rawUrl of urls) {
            const url = rawUrl.trim();
            for (const [key, provider] of Object.entries(PROVIDERS)) {
                if (!enabledProviders[key]) continue;
                const id = provider.extractId(url);
                if (id) {
                    const channelName = provider.extractChannel ? provider.extractChannel(url) : null;
                    return { provider: key, id, url, providerName: provider.name, channelName };
                }
            }
        }
        return null;
    }

    function getProvider(key) {
        return PROVIDERS[key] || null;
    }

    return { parseClipUrl, getProvider, PROVIDERS };
})();
