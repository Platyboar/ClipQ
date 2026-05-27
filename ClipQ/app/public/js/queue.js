/**
 * queue.js — Queue management with push-sorting logic
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Queue = (() => {
    let items = [];       // { id, provider, url, clipId, meta, submitters: [], pushCount, addedAt }
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

        if (typeof submitterInfoOrName === 'object' && submitterInfoOrName !== null) {
            submitter = submitterInfoOrName.name || 'unknown';
            isMod = !!submitterInfoOrName.isMod;
            isLeadMod = !!submitterInfoOrName.isLeadMod;
            isVip = !!submitterInfoOrName.isVip;
            isBroadcaster = !!submitterInfoOrName.isBroadcaster;
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
        if (ClipQ.Memory.has(clipData.url)) return 'memory';

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
            
            // Only update priority and push status if this specific submit is a push
            if (isPushed) {
                existing.priority = Math.max(existing.priority || 0, priority);
                existing.isPushed = true;
            }

            existing.pushCount = existing.submitters.length;
            sortByPush();
            notifyUpdate();
            return isPushed ? 'added' : 'pushed';
        }

        if (currentPlaying && (currentPlaying.url === clipData.url || (currentPlaying.clipId && currentPlaying.clipId === clipData.clipId))) {
            return 'playing'; // Already playing
        }

        if (settings.userClipLimit > 0) {
            const userClipsCount = items.filter(i => i.submitters.includes(submitter)).length;
            if (userClipsCount >= settings.userClipLimit) return 'limit';
        }

        items.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            provider: clipData.provider,
            url: clipData.url,
            clipId: clipData.clipId,
            meta: clipData.meta || {},
            submitters: [submitter],
            submitterRoles: {
                [submitter]: { isMod, isLeadMod, isVip, isBroadcaster }
            },
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

    function clear() {
        items = [];
        notifyUpdate();
    }

    function clearHistory() {
        history = [];
        saveHistory();
    }

    loadHistory();
    return { getItems, getHistory, getCount, isQueueOpen, setOpen, addClip, current, start, next, extractAndPlay, previousFromHistory, removeById, clear, clearHistory, setUpdateCallback, loadHistory, cleanupHistory };
})();
