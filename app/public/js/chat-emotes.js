/**
 * chat-emotes.js — Loads Twitch, 7TV, BetterTTV, and FrankerFaceZ chat emotes
 */
window.ClipQ = window.ClipQ || {};

ClipQ.ChatEmotes = (() => {
    'use strict';

    const URL_STRIP_RE = /\bhttps?:\/\/[^\s]+/gi;
    const globalEmotes = new Map();
    const channelEmotes = new Map();

    let globalsLoaded = false;
    let globalsPromise = null;
    let loadedChannelId = null;

    function normalizeHttpsUrl(rawUrl) {
        if (typeof rawUrl !== 'string') return '';
        const trimmed = rawUrl.trim();
        if (!trimmed) return '';
        const withProto = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
        return ClipQ.sanitizeUrl(withProto);
    }

    function addEmote(targetMap, name, url) {
        if (!name || typeof name !== 'string') return;
        const safeUrl = normalizeHttpsUrl(url);
        if (safeUrl) targetMap.set(name, safeUrl);
    }

    function parse7tvList(list, targetMap) {
        if (!Array.isArray(list)) return;
        list.forEach((entry) => {
            const name = entry?.name;
            const host = entry?.data?.host;
            const files = Array.isArray(host?.files) ? host.files : [];
            const chosen = files.find(f => f.name === '2x.webp')
                || files.find(f => f.name === '1x.webp')
                || files.find(f => f.format === 'WEBP');
            const rawUrl = (host?.url && chosen?.name)
                ? `${host.url}/${chosen.name}`
                : (entry?.id ? `https://cdn.7tv.app/emote/${encodeURIComponent(entry.id)}/2x.webp` : '');
            addEmote(targetMap, name, rawUrl);
        });
    }

    function parseBttvList(list, targetMap) {
        if (!Array.isArray(list)) return;
        list.forEach((entry) => {
            if (entry?.code && entry?.id) {
                addEmote(targetMap, entry.code, `https://cdn.betterttv.net/emote/${encodeURIComponent(entry.id)}/2x`);
            }
        });
    }

    function parseFfzSets(sets, setIds, targetMap) {
        if (!sets || typeof sets !== 'object') return;
        const keys = Array.isArray(setIds) && setIds.length ? setIds.map(String) : Object.keys(sets);
        keys.forEach((setId) => {
            const emoticons = sets[setId]?.emoticons;
            if (!Array.isArray(emoticons)) return;
            emoticons.forEach((entry) => {
                const urls = entry?.urls || {};
                addEmote(targetMap, entry?.name, urls['2'] || urls['1'] || urls['4'] || '');
            });
        });
    }

    async function fetchJsonQuiet(url) {
        try {
            const resp = await fetch(url);
            return resp.ok ? await resp.json() : null;
        } catch {
            return null;
        }
    }

    async function ensureGlobals() {
        if (globalsLoaded) return;
        if (globalsPromise) return globalsPromise;
        globalsPromise = (async () => {
            const [stv, bttv, ffz] = await Promise.all([
                fetchJsonQuiet('https://7tv.io/v3/emote-sets/global'),
                fetchJsonQuiet('https://api.betterttv.net/3/cached/emotes/global'),
                fetchJsonQuiet('https://api.frankerfacez.com/v1/set/global')
            ]);
            parseFfzSets(ffz?.sets, ffz?.default_sets, globalEmotes);
            parseBttvList(bttv, globalEmotes);
            parse7tvList(stv?.emotes, globalEmotes);
            if (stv || bttv || ffz) {
                globalsLoaded = true;
                if (ClipQ.ChatFeed && ClipQ.ChatFeed.refresh) ClipQ.ChatFeed.refresh();
            }
        })().finally(() => {
            globalsPromise = null;
        });
        return globalsPromise;
    }

    async function loadForChannel(broadcasterId) {
        const id = broadcasterId ? String(broadcasterId).trim() : '';
        const globalsTask = ensureGlobals();
        if (!/^\d+$/.test(id) || id === loadedChannelId) {
            await globalsTask;
            return;
        }

        loadedChannelId = id;
        channelEmotes.clear();
        const [, stv, bttv, ffz] = await Promise.all([
            globalsTask,
            fetchJsonQuiet(`https://7tv.io/v3/users/twitch/${encodeURIComponent(id)}`),
            fetchJsonQuiet(`https://api.betterttv.net/3/cached/users/twitch/${encodeURIComponent(id)}`),
            fetchJsonQuiet(`https://api.frankerfacez.com/v1/room/id/${encodeURIComponent(id)}`)
        ]);
        if (loadedChannelId !== id) return;
        parseFfzSets(ffz?.sets, ffz?.room?.set ? [ffz.room.set] : null, channelEmotes);
        parseBttvList(bttv?.channelEmotes, channelEmotes);
        parseBttvList(bttv?.sharedEmotes, channelEmotes);
        parse7tvList(stv?.emote_set?.emotes, channelEmotes);
        if (ClipQ.ChatFeed && ClipQ.ChatFeed.refresh) ClipQ.ChatFeed.refresh();
    }

    function collectTwitchRanges(rawText, twitchEmotes) {
        if (!twitchEmotes || typeof twitchEmotes !== 'object') return [];
        const ranges = [];
        Object.entries(twitchEmotes).forEach(([emoteId, spots]) => {
            if (!Array.isArray(spots) || !/^[A-Za-z0-9_-]+$/.test(emoteId)) return;
            spots.forEach((spot) => {
                const parts = String(spot).split('-');
                const start = Number.parseInt(parts[0], 10);
                const end = Number.parseInt(parts[1], 10);
                if (!Number.isNaN(start) && !Number.isNaN(end) && start >= 0 && end >= start && end < rawText.length) {
                    ranges.push({ start, end: end + 1, id: emoteId });
                }
            });
        });
        ranges.sort((a, b) => a.start - b.start);
        return ranges;
    }

    function buildEmoteImg(url, name) {
        const safeUrl = ClipQ.sanitizeUrl(url);
        if (!safeUrl) return ClipQ.escapeHtml(name);
        const safeName = ClipQ.escapeHtml(name);
        return `<img class="chat-emote" src="${ClipQ.escapeHtml(safeUrl)}" alt="${safeName}" title="${safeName}">`;
    }

    function renderTextChunk(chunk, showLinks) {
        const cleaned = showLinks ? chunk : chunk.replace(URL_STRIP_RE, '').replace(/\s{2,}/g, ' ');
        if (!cleaned) return '';
        return cleaned.split(/(\s+)/).map((part) => {
            if (!part) return '';
            if (/^\s+$/.test(part)) return part;
            const customUrl = channelEmotes.get(part) || globalEmotes.get(part);
            return customUrl ? buildEmoteImg(customUrl, part) : ClipQ.escapeHtml(part);
        }).join('');
    }

    function formatMessageHtml(rawMessage, twitchEmotes, showLinks) {
        const rawText = typeof rawMessage === 'string' ? rawMessage : '';
        if (!rawText) return '';

        const ranges = collectTwitchRanges(rawText, twitchEmotes);
        const segments = [];
        let cursor = 0;

        ranges.forEach((range) => {
            if (range.start < cursor) return;
            if (range.start > cursor) {
                segments.push(renderTextChunk(rawText.slice(cursor, range.start), showLinks));
            }
            const name = rawText.slice(range.start, range.end);
            const url = `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(range.id)}/default/dark/2.0`;
            segments.push(buildEmoteImg(url, name));
            cursor = range.end;
        });

        if (cursor < rawText.length) {
            segments.push(renderTextChunk(rawText.slice(cursor), showLinks));
        }

        const html = segments.join('');
        return showLinks ? html : html.trim();
    }

    return { loadForChannel, formatMessageHtml };
})();
