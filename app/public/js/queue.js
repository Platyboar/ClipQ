/**
 * queue.js — Queue management with push-sorting logic
 * Supports: canonical deduplication, msg-id tracking, smart submitter removal, URL/ID-based removal,
 * full history navigation, and queue persistence across reloads.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Queue = (() => {
    'use strict';

    let items = [];       // { id, provider, url, clipId, meta, submitters: [], submitterRoles, submitterLogins, pushedBy, pushCount, priority, isPushed, addedAt, pushedAt, msgIds }
    let history = [];     // Same structure + watchedAt timestamp
    let currentPlaying = null;
    let playingFromHistory = false;
    let historyIndex = -1;
    let isOpen = false;
    let onUpdate = null;  // Callback when queue changes

    const HISTORY_KEY = 'clipq_history';
    const QUEUE_KEY = 'clipq_queue';
    const MAX_HISTORY_ITEMS = 500;

    function normalizeClipUrl(item) {
        if (!item || !item.url || !ClipQ.Providers?.getCanonicalUrl) return false;
        const tw = item.provider === 'twitch' ? ClipQ.Providers.getProvider?.('twitch') : null;
        const slug = tw ? tw.extractId(item.url) : null;
        let changed = false;
        if (slug && slug !== item.clipId) {
            item.clipId = slug;
            changed = true;
        }
        const canonical = ClipQ.Providers.getCanonicalUrl(item.provider, item.clipId, item.url);
        if (canonical && canonical !== item.url) {
            item.url = canonical;
            changed = true;
        }
        return changed;
    }

    function normalizeStoredList(list, seed) {
        let changed = false;
        list.forEach((item, idx) => {
            if (item && !item.id) { item.id = `${seed}_${idx}`; changed = true; }
            if (normalizeClipUrl(item)) changed = true;
        });
        return changed;
    }

    function syncHistoryPlayback() {
        if (!playingFromHistory) return false;
        const newIdx = currentPlaying ? history.indexOf(currentPlaying) : -1;
        if (newIdx >= 0) {
            historyIndex = newIdx;
            return false;
        }
        playingFromHistory = false;
        historyIndex = -1;
        // Clear stale history clip so Next does not re-archive a deleted history entry.
        currentPlaying = null;
        saveAndNotify();
        return true;
    }

    function saveAndNotify() {
        saveQueue();
        notifyUpdate();
    }

    function loadQueue() {
        try {
            const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) || 'null');
            if (saved && Array.isArray(saved.items)) {
                items = saved.items;
                if (saved.currentPlaying && !items.some(i => i.id === saved.currentPlaying.id)) {
                    items.unshift(saved.currentPlaying);
                }
                if (normalizeStoredList(items, Date.now())) saveQueue();
            }
        } catch { items = []; }
    }

    function saveQueue() {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify({
                items,
                currentPlaying: !playingFromHistory ? currentPlaying : null
            }));
        } catch { /* ignore quota errors */ }
    }

    function loadHistory() {
        try {
            const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            history = Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY_ITEMS) : [];
        } catch { history = []; }
        const normalized = normalizeStoredList(history, Date.now());
        cleanupHistory();
        if (normalized) saveHistory();
    }

    function saveHistory() {
        if (history.length > MAX_HISTORY_ITEMS) history = history.slice(-MAX_HISTORY_ITEMS);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
    }

    function cleanupHistory() {
        const settings = ClipQ.Settings ? ClipQ.Settings.get() : null;
        const retentionDays = settings ? (settings.historyRetentionDays || 0) : 0;
        if (retentionDays <= 0) return false; // 0 = keep forever

        const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        const before = history.length;
        history = history.filter(item => {
            const watchedAt = item.watchedAt || item.addedAt || 0;
            return watchedAt > cutoff;
        });
        if (history.length < before) {
            console.log(`[History] Cleaned ${before - history.length} old entries (>${retentionDays} days)`);
            const clearedActivePlayback = syncHistoryPlayback();
            saveHistory();
            return clearedActivePlayback;
        }
        return false;
    }

    function setUpdateCallback(fn) { onUpdate = fn; }
    function notifyUpdate() { if (onUpdate) onUpdate(); }

    function getItems() { return items; }
    function getHistory() { return history; }
    function isQueueOpen() { return isOpen; }
    function setOpen(val) { isOpen = val; }

    function isSameClip(item, provider, clipId, url) {
        if (!item) return false;
        if (provider && clipId && item.provider === provider && item.clipId === clipId) return true;
        if (url && item.url && item.url.toLowerCase().trim() === url.toLowerCase().trim()) return true;
        if (provider !== 'twitch' || item.provider !== 'twitch') return false;
        const tw = ClipQ.Providers?.getProvider?.('twitch');
        const slugA = tw?.extractId(item.url || '') || item.clipId;
        const slugB = clipId || tw?.extractId(url || '');
        return Boolean(slugA && slugB && slugA === slugB);
    }

    function recalculateItemPriority(item) {
        item.pushCount = item.submitters.length;
        const pushedPriorities = item.pushedBy ? Object.values(item.pushedBy) : [];
        const maxPriority = pushedPriorities.length > 0 ? Math.max(...pushedPriorities) : 0;
        item.priority = maxPriority;
        item.isPushed = maxPriority > 0;
    }

    function findSubmitterName(item, usernameOrLogin) {
        if (!item || !usernameOrLogin) return null;
        const lower = usernameOrLogin.toLowerCase();
        return item.submitters.find(s =>
            s.toLowerCase() === lower ||
            (item.submitterLogins && item.submitterLogins[s] && item.submitterLogins[s].toLowerCase() === lower)
        ) || null;
    }

    function removeSubmitterFromItem(item, storedName) {
        item.submitters = item.submitters.filter(s => s !== storedName);
        if (item.submitterRoles) delete item.submitterRoles[storedName];
        if (item.submitterLogins) delete item.submitterLogins[storedName];
        if (item.pushedBy) delete item.pushedBy[storedName];
        if (item.msgIds) {
            for (const [mid, sub] of Object.entries(item.msgIds)) {
                if (sub === storedName) delete item.msgIds[mid];
            }
        }
        recalculateItemPriority(item);
    }

    function addClip(clipData, submitterInfoOrName) {
        if (!isOpen) return 'closed';

        normalizeClipUrl(clipData);
        const settings = ClipQ.Settings.get();
        const info = (typeof submitterInfoOrName === 'object' && submitterInfoOrName !== null) ? submitterInfoOrName : null;
        const submitter = (info ? info.name : submitterInfoOrName) || 'unknown';
        const submitterLogin = ((info && info.login) || submitter).toLowerCase();
        const isMod = !!(info && info.isMod);
        const isLeadMod = !!(info && info.isLeadMod);
        const isVip = !!(info && info.isVip);
        const isBroadcaster = !!(info && info.isBroadcaster);
        const msgId = (info && info.msgId) || clipData.msgId || null;

        const isPushed = !!clipData.isPushed;

        // Priority is ONLY assigned if this is a pushed clip (via !queue push)
        const priority = isPushed ? (isBroadcaster ? 3 : isLeadMod ? 2 : isMod ? 1 : 0) : 0;

        if (ClipQ.Settings.isUserBlocked(submitter) || ClipQ.Settings.isUserBlocked(submitterLogin)) {
            return 'blocked';
        }

        const bypassRoles = settings.memory?.bypassRoles;
        const bypassMemory = isBroadcaster || (isLeadMod && bypassRoles?.leadMod) || (isMod && bypassRoles?.mod);

        if (!bypassMemory && ClipQ.Memory.has(clipData.url, clipData.provider, clipData.clipId)) {
            return 'memory';
        }

        if (settings.ageLimitDays > 0 && clipData.meta && clipData.meta.createdAt) {
            const clipDate = new Date(clipData.meta.createdAt);
            if (!Number.isNaN(clipDate.getTime())) {
                const daysDiff = (Date.now() - clipDate.getTime()) / (1000 * 60 * 60 * 24);
                if (daysDiff > settings.ageLimitDays) return 'age';
            }
        }

        const hasReachedUserLimit = () => {
            if (isPushed || settings.userClipLimit <= 0) return false;
            const userKey = submitterLogin || submitter;
            return items.filter(i => !!findSubmitterName(i, userKey)).length >= settings.userClipLimit;
        };

        const existing = items.find(item => isSameClip(item, clipData.provider, clipData.clipId, clipData.url));
        if (existing) {
            const alreadySubmitted = !!findSubmitterName(existing, submitterLogin || submitter);
            if (!alreadySubmitted && hasReachedUserLimit()) return 'limit';

            const storedKey = findSubmitterName(existing, submitterLogin || submitter) || submitter;
            if (!alreadySubmitted) {
                existing.submitters.push(storedKey);
            }
            if (!existing.submitterRoles) existing.submitterRoles = {};
            existing.submitterRoles[storedKey] = { isMod, isLeadMod, isVip, isBroadcaster };
            if (!existing.submitterLogins) existing.submitterLogins = {};
            existing.submitterLogins[storedKey] = submitterLogin;

            if (!existing.msgIds) existing.msgIds = {};
            if (msgId) existing.msgIds[msgId] = storedKey;

            if (isPushed) {
                if (!existing.pushedBy) existing.pushedBy = {};
                existing.pushedBy[storedKey] = Math.max(existing.pushedBy[storedKey] || 0, priority);
                existing.pushedAt = Date.now();
            }

            recalculateItemPriority(existing);
            sortByPush();
            saveAndNotify();
            return isPushed ? 'pushed' : 'added';
        }

        if (currentPlaying && isSameClip(currentPlaying, clipData.provider, clipData.clipId, clipData.url)) {
            return 'playing'; // Already playing
        }

        if (hasReachedUserLimit()) return 'limit';

        const msgIds = {};
        if (msgId) msgIds[msgId] = submitter;

        const pushedBy = {};
        if (isPushed && priority > 0) pushedBy[submitter] = priority;

        const now = Date.now();
        items.push({
            id: now + '_' + Math.random().toString(36).substring(2, 7),
            provider: clipData.provider,
            url: clipData.url,
            clipId: clipData.clipId,
            meta: clipData.meta || {},
            submitters: [submitter],
            submitterRoles: {
                [submitter]: { isMod, isLeadMod, isVip, isBroadcaster }
            },
            submitterLogins: {
                [submitter]: submitterLogin
            },
            pushedBy,
            msgIds,
            priority,
            isPushed,
            pushCount: 1,
            addedAt: now,
            pushedAt: isPushed ? now : 0
        });

        sortByPush();
        saveAndNotify();
        return 'added';
    }

    function sortByPush() {
        items.sort((a, b) => {
            const aPri = a.priority || 0;
            const bPri = b.priority || 0;
            if (bPri !== aPri) return bPri - aPri;

            // If both are prioritized (> 0), newest push comes first
            if (aPri > 0) {
                return (b.pushedAt || b.addedAt) - (a.pushedAt || a.addedAt);
            }

            // If both are normal viewer clips (priority 0)
            if (b.pushCount !== a.pushCount) return b.pushCount - a.pushCount;
            return a.addedAt - b.addedAt;
        });
    }

    function archiveCurrent() {
        if (currentPlaying && !playingFromHistory) {
            ClipQ.Memory.add(currentPlaying.url, currentPlaying.provider, currentPlaying.clipId);
            currentPlaying.watchedAt = Date.now();
            history.push(currentPlaying);
            saveHistory();
        }
    }

    function start() {
        if (items.length === 0) return null;
        playingFromHistory = false;
        historyIndex = -1;
        currentPlaying = items.shift();
        saveAndNotify();
        return currentPlaying;
    }

    function advancePlayback(archive) {
        if (playingFromHistory) {
            if (!archive && historyIndex >= 0 && historyIndex < history.length) {
                history.splice(historyIndex, 1);
                saveHistory();
            } else {
                historyIndex++;
            }
            if (historyIndex >= 0 && historyIndex < history.length) {
                currentPlaying = history[historyIndex];
                notifyUpdate();
                return currentPlaying;
            }
            playingFromHistory = false;
            historyIndex = -1;
        } else if (archive) {
            archiveCurrent();
        }

        currentPlaying = items.length > 0 ? items.shift() : null;
        saveAndNotify();
        return currentPlaying;
    }

    function next() { return advancePlayback(true); }
    function skipCurrent() { return advancePlayback(false); }

    /** Extract specific clip and move it to playback, archiving the currently playing live clip */
    function extractAndPlay(id) {
        archiveCurrent();
        playingFromHistory = false;
        historyIndex = -1;

        const index = items.findIndex(i => i.id === id);
        if (index > -1) {
            currentPlaying = items.splice(index, 1)[0];
        } else {
            currentPlaying = null;
        }

        saveAndNotify();
        return currentPlaying;
    }

    function previousFromHistory() {
        if (history.length === 0) return null;

        if (!playingFromHistory) {
            if (currentPlaying) {
                items.unshift(currentPlaying);
            }
            playingFromHistory = true;
            historyIndex = history.length - 1;
        } else if (historyIndex > 0) {
            historyIndex--;
        } else {
            return null;
        }

        currentPlaying = history[historyIndex];
        saveAndNotify();
        return currentPlaying;
    }

    function removeById(id) {
        const before = items.length;
        items = items.filter(item => item.id !== id);
        if (items.length < before) {
            saveAndNotify();
        }
    }

    /** Remove a clip by its chat message ID when deleted by moderation. */
    function removeByMsgId(msgId) {
        const item = items.find(i => i.msgIds && i.msgIds[msgId]);
        if (!item) return;

        const submitter = item.msgIds[msgId];
        console.log(`[Queue] Removing clip submitted via deleted message (msg-id: ${msgId}, submitter: ${submitter})`);

        if (item.submitters.length <= 1) {
            items = items.filter(i => i.id !== item.id);
        } else {
            // Check if the same submitter still has other non-deleted messages for this clip
            const hasOtherMsg = Object.entries(item.msgIds).some(([mid, sub]) => mid !== msgId && sub === submitter);
            delete item.msgIds[msgId];
            if (!hasOtherMsg) {
                removeSubmitterFromItem(item, submitter);
                sortByPush();
            }
        }
        saveAndNotify();
    }

    function removeSubmitterFromMatchedItems(matchesItem, usernameOrLogin, contextLabel) {
        let changed = false;

        items = items.filter(item => {
            if (!matchesItem(item)) return true;

            const storedName = findSubmitterName(item, usernameOrLogin);
            if (!storedName) return true;

            if (item.submitters.length <= 1) {
                console.log(`[Queue] Removing ${contextLabel} "${item.meta?.title || item.url}" — sole submitter "${storedName}" removed`);
                changed = true;
                return false;
            }
            removeSubmitterFromItem(item, storedName);
            console.log(`[Queue] Removed submitter "${storedName}" from ${contextLabel} "${item.meta?.title || item.url}" (${item.submitters.length} remaining)`);
            changed = true;
            return true;
        });

        if (changed) {
            sortByPush();
            saveAndNotify();
        }
    }

    /** Smart removal of a submitter from all their clips (timeouts, bans, or remove all). */
    function removeSubmitter(usernameOrLogin) {
        removeSubmitterFromMatchedItems(() => true, usernameOrLogin, 'clip');
    }

    /** Remove a clip by URL (privileged command). */
    function removeByUrl(url) {
        const parsed = ClipQ.Providers ? ClipQ.Providers.parseClipUrl(url) : null;
        const before = items.length;
        items = items.filter(item => !isSameClip(item, parsed?.provider, parsed?.id, url));
        if (items.length < before) {
            console.log(`[Queue] Removed clip by URL: ${url}`);
            saveAndNotify();
        }
    }

    /** Remove caller's own clip by URL. */
    function removeOwnClipByUrl(url, usernameOrLogin) {
        const parsed = ClipQ.Providers ? ClipQ.Providers.parseClipUrl(url) : null;
        removeSubmitterFromMatchedItems(
            (item) => isSameClip(item, parsed?.provider, parsed?.id, url),
            usernameOrLogin,
            'own clip'
        );
    }

    function clear() {
        items = [];
        saveAndNotify();
    }

    function removeHistoryById(id) {
        const idx = history.findIndex(item => item.id === id);
        if (idx === -1) return { removed: false, clearedActivePlayback: false };
        history.splice(idx, 1);
        const clearedActivePlayback = syncHistoryPlayback();
        saveHistory();
        return { removed: true, clearedActivePlayback };
    }

    function clearHistory() {
        history = [];
        const clearedActivePlayback = syncHistoryPlayback();
        saveHistory();
        return clearedActivePlayback;
    }

    loadQueue();
    loadHistory();
    return {
        getItems, getHistory, isQueueOpen, setOpen, addClip, start, next, skipCurrent,
        extractAndPlay, previousFromHistory, removeById, removeByMsgId,
        removeSubmitter, removeByUrl, removeOwnClipByUrl, clear,
        removeHistoryById, clearHistory, setUpdateCallback, cleanupHistory
    };
})();
