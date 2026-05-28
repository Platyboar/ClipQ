/**
 * queue.js — Queue management with push-sorting logic
 * Supports: msg-id tracking, smart submitter removal, URL-based removal.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Queue = (() => {
    let items = [];       // { id, provider, url, clipId, meta, submitters: [], pushCount, addedAt, msgIds: {} }
    let history = [];     // Same structure + watchedAt timestamp
    let currentPlaying = null;
    let isOpen = false;
    let onUpdate = null;  // Callback when queue changes

    const HISTORY_KEY = 'clipq_history';

    function loadHistory() {
        try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { history = []; }
        cleanupHistory();
    }
    function saveHistory() {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-500))); // Keep last 500
    }

    function cleanupHistory() {
        const settings = ClipQ.Settings ? ClipQ.Settings.get() : null;
        const retentionDays = settings ? (settings.historyRetentionDays || 0) : 0;
        if (retentionDays <= 0) return; // 0 = keep forever

        const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        const before = history.length;
        history = history.filter(item => {
            const watchedAt = item.watchedAt || item.addedAt || 0;
            return watchedAt > cutoff;
        });
        if (history.length < before) {
            console.log(`[History] Cleaned ${before - history.length} old entries (>${retentionDays} days)`);
            saveHistory();
        }
    }

    function setUpdateCallback(fn) { onUpdate = fn; }
    function notifyUpdate() { if (onUpdate) onUpdate(); }

    function getItems() { return items; }
    function getHistory() { return history; }
    function getCount() { return items.length; }
    function isQueueOpen() { return isOpen; }
    function setOpen(val) { isOpen = val; }

    function addClip(clipData, submitterInfoOrName) {
        if (!isOpen) return 'closed';

        const settings = ClipQ.Settings.get();

        // Extract submitter name and roles
        let submitter = 'unknown';
        let isMod = false;
        let isLeadMod = false;
        let isVip = false;
        let isBroadcaster = false;
        let msgId = clipData.msgId || null;

        if (typeof submitterInfoOrName === 'object' && submitterInfoOrName !== null) {
            submitter = submitterInfoOrName.name || 'unknown';
            isMod = !!submitterInfoOrName.isMod;
            isLeadMod = !!submitterInfoOrName.isLeadMod;
            isVip = !!submitterInfoOrName.isVip;
            isBroadcaster = !!submitterInfoOrName.isBroadcaster;
            if (submitterInfoOrName.msgId) msgId = submitterInfoOrName.msgId;
        } else {
            submitter = submitterInfoOrName || 'unknown';
        }

        const isPushed = !!clipData.isPushed;

        // Priority is ONLY assigned if this is a pushed clip (via !queuepush)
        let priority = 0;
        if (isPushed) {
            if (isBroadcaster) priority = 3;
            else if (isLeadMod) priority = 2;
            else if (isMod) priority = 1;
        }

        if (ClipQ.Settings.isUserBlocked(submitter)) return 'blocked';

        let bypassMemory = false;
        if (isBroadcaster) {
            bypassMemory = true;
        } else if (isLeadMod && settings.memory?.bypassRoles?.leadMod) {
            bypassMemory = true;
        } else if (isMod && settings.memory?.bypassRoles?.mod) {
            bypassMemory = true;
        }

        if (!bypassMemory && ClipQ.Memory.has(clipData.url)) return 'memory';

        if (settings.ageLimitDays > 0 && clipData.meta && clipData.meta.createdAt) {
            const clipDate = new Date(clipData.meta.createdAt);
            const daysDiff = (Date.now() - clipDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > settings.ageLimitDays) return 'age';
        }

        const existing = items.find(item => item.url === clipData.url || (item.clipId && item.clipId === clipData.clipId));
        if (existing) {
            if (!existing.submitters.includes(submitter)) {
                existing.submitters.push(submitter);
            }
            if (!existing.submitterRoles) existing.submitterRoles = {};
            existing.submitterRoles[submitter] = { isMod, isLeadMod, isVip, isBroadcaster };

            // Track msg-id per submitter
            if (!existing.msgIds) existing.msgIds = {};
            if (msgId) existing.msgIds[msgId] = submitter;

            // Only update priority and push status if this specific submit is a push
            if (isPushed) {
                existing.priority = Math.max(existing.priority || 0, priority);
                existing.isPushed = true;
            }

            existing.pushCount = existing.submitters.length;
            sortByPush();
            notifyUpdate();
            return isPushed ? 'pushed' : 'added';
        }

        if (currentPlaying && (currentPlaying.url === clipData.url || (currentPlaying.clipId && currentPlaying.clipId === clipData.clipId))) {
            return 'playing'; // Already playing
        }

        if (settings.userClipLimit > 0) {
            const userClipsCount = items.filter(i => i.submitters.includes(submitter)).length;
            if (userClipsCount >= settings.userClipLimit) return 'limit';
        }

        const msgIds = {};
        if (msgId) msgIds[msgId] = submitter;

        items.push({
            id: Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            provider: clipData.provider,
            url: clipData.url,
            clipId: clipData.clipId,
            meta: clipData.meta || {},
            submitters: [submitter],
            submitterRoles: {
                [submitter]: { isMod, isLeadMod, isVip, isBroadcaster }
            },
            msgIds,
            priority: priority,
            isPushed: isPushed,
            pushCount: 1,
            addedAt: Date.now()
        });

        sortByPush();
        notifyUpdate();
        return 'added';
    }

    function sortByPush() {
        items.sort((a, b) => {
            const aPri = a.priority || 0;
            const bPri = b.priority || 0;
            if (bPri !== aPri) return bPri - aPri;

            // If both are prioritized (> 0)
            if (aPri > 0) {
                // Newest push first (first place within priority tier)
                return b.addedAt - a.addedAt;
            }

            // If both are normal viewer clips (priority 0)
            if (b.pushCount !== a.pushCount) return b.pushCount - a.pushCount;
            return a.addedAt - b.addedAt;
        });
    }

    function current() {
        return currentPlaying;
    }

    function start() {
        if (items.length === 0) return null;
        currentPlaying = items.shift();
        notifyUpdate();
        return currentPlaying;
    }

    function next() {
        if (currentPlaying) {
            ClipQ.Memory.add(currentPlaying.url);
            currentPlaying.watchedAt = Date.now();
            history.push(currentPlaying);
            saveHistory();
        }
        if (items.length === 0) {
            currentPlaying = null;
            notifyUpdate();
            return null;
        }
        currentPlaying = items.shift();
        notifyUpdate();
        return currentPlaying;
    }

    /** Extract specific clip and move it to the front, pushing the currently playing one to history */
    function extractAndPlay(id) {
        if (currentPlaying) {
            ClipQ.Memory.add(currentPlaying.url);
            currentPlaying.watchedAt = Date.now();
            history.push(currentPlaying);
            saveHistory();
        }

        const index = items.findIndex(i => i.id === id);
        if (index > -1) {
            currentPlaying = items.splice(index, 1)[0];
        } else {
            currentPlaying = null;
        }

        notifyUpdate();
        return currentPlaying;
    }

    function previousFromHistory() {
        return history.length > 0 ? history[history.length - 1] : null;
    }

    function removeById(id) {
        items = items.filter(item => item.id !== id);
        notifyUpdate();
    }

    /**
     * Remove a clip by its chat message ID.
     * Used when a message is deleted by a mod/bot.
     */
    function removeByMsgId(msgId) {
        const item = items.find(i => i.msgIds && i.msgIds[msgId]);
        if (!item) return;

        const submitter = item.msgIds[msgId];
        console.log(`[Queue] Removing clip submitted via deleted message (msg-id: ${msgId}, submitter: ${submitter})`);

        if (item.submitters.length <= 1) {
            // Only one submitter — remove the entire clip
            items = items.filter(i => i.id !== item.id);
        } else {
            // Multiple submitters — only remove this submitter
            item.submitters = item.submitters.filter(s => s !== submitter);
            if (item.submitterRoles) delete item.submitterRoles[submitter];
            delete item.msgIds[msgId];
            item.pushCount = item.submitters.length;
        }
        notifyUpdate();
    }

    /**
     * Smart removal of a submitter from all their clips.
     * Used for timeout/ban events and "remove all" self-service.
     * - If the user is the only submitter → remove the entire clip
     * - If there are multiple submitters → only remove the user's name
     */
    function removeSubmitter(username) {
        const lowerName = username.toLowerCase();
        let changed = false;

        items = items.filter(item => {
            const idx = item.submitters.findIndex(s => s.toLowerCase() === lowerName);
            if (idx === -1) return true; // User not a submitter of this clip

            if (item.submitters.length <= 1) {
                // Only submitter → remove entire clip
                console.log(`[Queue] Removing clip "${item.meta?.title}" — sole submitter "${username}" removed`);
                changed = true;
                return false;
            } else {
                // Multiple submitters → just remove the name
                item.submitters.splice(idx, 1);
                if (item.submitterRoles) delete item.submitterRoles[username];
                // Also clean up their msg-ids
                if (item.msgIds) {
                    for (const [mid, sub] of Object.entries(item.msgIds)) {
                        if (sub.toLowerCase() === lowerName) delete item.msgIds[mid];
                    }
                }
                item.pushCount = item.submitters.length;
                console.log(`[Queue] Removed submitter "${username}" from clip "${item.meta?.title}" (${item.submitters.length} remaining)`);
                changed = true;
                return true;
            }
        });

        if (changed) notifyUpdate();
    }

    /**
     * Remove a clip by URL (used by privileged "remove" command).
     */
    function removeByUrl(url) {
        const normalizedUrl = url.toLowerCase().trim();
        const before = items.length;
        items = items.filter(item => item.url.toLowerCase().trim() !== normalizedUrl);
        if (items.length < before) {
            console.log(`[Queue] Removed clip by URL: ${url}`);
            notifyUpdate();
        }
    }

    /**
     * Remove own clip by URL (used by non-privileged "remove" command).
     * If the user is the only submitter → remove the clip.
     * If there are multiple submitters → only remove the user's name.
     */
    function removeOwnClipByUrl(url, username) {
        const normalizedUrl = url.toLowerCase().trim();
        const lowerName = username.toLowerCase();
        let changed = false;

        items = items.filter(item => {
            if (item.url.toLowerCase().trim() !== normalizedUrl) return true;

            const idx = item.submitters.findIndex(s => s.toLowerCase() === lowerName);
            if (idx === -1) return true; // User is not a submitter

            if (item.submitters.length <= 1) {
                console.log(`[Queue] User "${username}" removed own clip: ${url}`);
                changed = true;
                return false;
            } else {
                item.submitters.splice(idx, 1);
                if (item.submitterRoles) delete item.submitterRoles[username];
                item.pushCount = item.submitters.length;
                console.log(`[Queue] User "${username}" removed self from clip: ${url}`);
                changed = true;
                return true;
            }
        });

        if (changed) notifyUpdate();
    }

    function clear() {
        items = [];
        notifyUpdate();
    }

    function clearHistory() {
        history = [];
        saveHistory();
    }

    loadHistory();
    return {
        getItems, getHistory, getCount, isQueueOpen, setOpen,
        addClip, current, start, next, extractAndPlay, previousFromHistory,
        removeById, removeByMsgId, removeSubmitter, removeByUrl, removeOwnClipByUrl,
        clear, clearHistory, setUpdateCallback, loadHistory, cleanupHistory
    };
})();
