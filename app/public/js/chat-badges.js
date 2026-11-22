/**
 * chat-badges.js — Loads Twitch global and channel chat badges via Helix or worker proxy
 */
window.ClipQ = window.ClipQ || {};

ClipQ.ChatBadges = (() => {
    'use strict';

    const FALLBACK_SET_MAP = {
        broadcaster: { key: 'broadcaster', i18nKey: 'roles.broadcaster' },
        lead_moderator: { key: 'leadMod', i18nKey: 'roles.lead_mod' },
        'lead-moderator': { key: 'leadMod', i18nKey: 'roles.lead_mod' },
        moderator: { key: 'mod', i18nKey: 'roles.mod' },
        vip: { key: 'vip', i18nKey: 'roles.vip' },
        subscriber: { url: 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1', title: 'Subscriber' },
        founder: { url: 'https://static-cdn.jtvnw.net/badges/v1/511b78a9-ab37-472f-9569-457753bbe7d3/1', title: 'Founder' }
    };
    const PRIORITY_SETS = ['broadcaster', 'lead_moderator', 'lead-moderator', 'moderator', 'vip', 'founder', 'subscriber'];

    let badgeMap = {};
    let loadedChannelId = null;
    let loadingChannelId = null;

    function mergeBadgeSets(sets) {
        if (!Array.isArray(sets)) return;
        sets.forEach((badgeSet) => {
            if (!badgeSet || !badgeSet.set_id || !Array.isArray(badgeSet.versions)) return;
            const versions = badgeMap[badgeSet.set_id] || {};
            badgeSet.versions.forEach((ver) => {
                if (!ver || !ver.id || !ver.image_url_1x) return;
                versions[String(ver.id)] = {
                    url: ver.image_url_2x || ver.image_url_1x,
                    title: ver.title || badgeSet.set_id
                };
            });
            badgeMap[badgeSet.set_id] = versions;
        });
    }

    async function fetchHelixBadgeSet(endpoint, token) {
        const res = await fetch(`https://api.twitch.tv/helix/${endpoint}`, {
            headers: {
                'Client-ID': ClipQ.CLIENT_ID,
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) return null;
        const json = await res.json();
        return Array.isArray(json?.data) ? json.data : null;
    }

    async function loadForChannel(broadcasterId) {
        const id = broadcasterId ? String(broadcasterId).trim() : '';
        if (!/^\d+$/.test(id) || id === loadedChannelId || id === loadingChannelId) return;

        loadingChannelId = id;
        const token = ClipQ.Auth && ClipQ.Auth.getToken ? ClipQ.Auth.getToken() : null;
        try {
            if (token && !ClipQ.Auth?.getActiveObsKey?.()) {
                const [globalSets, channelSets] = await Promise.all([
                    fetchHelixBadgeSet('chat/badges/global', token),
                    fetchHelixBadgeSet(`chat/badges?broadcaster_id=${encodeURIComponent(id)}`, token)
                ]);
                badgeMap = {};
                mergeBadgeSets(globalSets);
                mergeBadgeSets(channelSets);
                loadedChannelId = id;
            } else if (ClipQ.Auth && ClipQ.Auth.getActiveObsKey && ClipQ.Auth.getActiveObsKey()) {
                const res = await ClipQ.fetchWithAuth(`/api/twitch-meta?type=badges&id=${encodeURIComponent(id)}`);
                if (res && res.ok) {
                    const data = await res.json();
                    if (data && data.badges && typeof data.badges === 'object') {
                        badgeMap = data.badges;
                        loadedChannelId = id;
                    }
                }
            }
            if (ClipQ.ChatFeed && ClipQ.ChatFeed.refresh) ClipQ.ChatFeed.refresh();
        } catch {
            /* keep built-in badge fallbacks on transient API failure */
        } finally {
            if (loadingChannelId === id) loadingChannelId = null;
        }
    }

    function resolveSingleBadge(setId, version) {
        const mapped = badgeMap[setId] && badgeMap[setId][String(version)];
        if (mapped && mapped.url) return mapped;
        const fallback = FALLBACK_SET_MAP[setId];
        if (!fallback) return null;
        if (fallback.key) {
            const url = ClipQ.ROLE_BADGES && ClipQ.ROLE_BADGES[fallback.key];
            const title = ClipQ.I18n && ClipQ.I18n.t ? ClipQ.I18n.t(fallback.i18nKey) : setId;
            return url ? { url, title } : null;
        }
        return { url: fallback.url, title: fallback.title };
    }

    function renderBadgesHtml(rawBadges, fallbackRoles) {
        if (!rawBadges || typeof rawBadges !== 'object' || Object.keys(rawBadges).length === 0) {
            return ClipQ.buildRoleBadge ? ClipQ.buildRoleBadge(fallbackRoles) : '';
        }
        const orderedSets = [];
        const seen = new Set();
        PRIORITY_SETS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(rawBadges, key) && !seen.has(key)) {
                seen.add(key);
                orderedSets.push(key);
            }
        });
        Object.keys(rawBadges).forEach((key) => {
            if (!seen.has(key)) orderedSets.push(key);
        });

        const parts = [];
        orderedSets.forEach((setId) => {
            const ver = rawBadges[setId];
            if (ver === undefined || ver === null || ver === '') return;
            const resolved = resolveSingleBadge(setId, ver);
            const safeUrl = resolved ? ClipQ.sanitizeUrl(resolved.url) : '';
            if (!safeUrl) return;
            const safeTitle = ClipQ.escapeHtml(resolved.title || setId);
            parts.push(`<img class="badge-role chat-badge" src="${ClipQ.escapeHtml(safeUrl)}" title="${safeTitle}" alt="${safeTitle}">`);
        });
        return parts.join('');
    }

    return { loadForChannel, renderBadgesHtml };
})();
