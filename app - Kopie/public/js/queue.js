/**
 * queue.js — Queue management with push-sorting logic
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Queue = (() => {
    let items = [];       // { id, provider, url, clipId, meta, submitters: [], pushCount, addedAt }
    let history = [];     // Same structure + watchedAt timestamp
    let isOpen = false;
    let onUpdate = null;  // Callback when queue changes

    const HISTORY_KEY = 'clipq_history';

    function loadHistory() {
        try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { history = []; }
        // Run retention cleanup on load
        cleanupHistory();
    }
    function saveHistory() {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-500))); // Keep last 500
    }

    /** Remove history entries older than retention days. Does NOT affect clip memory. */
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

    /**
     * Add a clip or push it up if already in queue.
     * Returns 'added', 'pushed', 'blocked', 'memory', 'limit', 'age', or 'closed'.
     */
    function addClip(clipData, submitter) {
        if (!isOpen) return 'closed';

        const settings = ClipQ.Settings.get();

        // Check blocked users
        if (ClipQ.Settings.isUserBlocked(submitter)) return 'blocked';

        // Check clip memory
        if (ClipQ.Memory.has(clipData.url)) return 'memory';

        // Check age limit
        if (settings.ageLimitDays > 0 && clipData.meta && clipData.meta.createdAt) {
            const clipDate = new Date(clipData.meta.createdAt);
            const daysDiff = (Date.now() - clipDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > settings.ageLimitDays) return 'age';
        }

        // Check if clip already in queue (by URL or clipId)
        const existing = items.find(item => item.url === clipData.url || (item.clipId && item.clipId === clipData.clipId));
        if (existing) {
            if (!existing.submitters.includes(submitter)) {
                existing.submitters.push(submitter);
            }
            existing.pushCount = existing.submitters.length;
            sortByPush();
            notifyUpdate();
            return 'pushed';
        }

        // Check clip limit
        if (settings.clipLimit > 0 && items.length >= settings.clipLimit) return 'limit';

        // Add new clip
        items.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            provider: clipData.provider,
            url: clipData.url,
            clipId: clipData.clipId,
            meta: clipData.meta || {},
            submitters: [submitter],
            pushCount: 1,
            addedAt: Date.now()
        });

        sortByPush();
        notifyUpdate();
        return 'added';
    }

    /** Sort: highest pushCount first, then by addedAt (FIFO within same pushCount) */
    function sortByPush() {
        items.sort((a, b) => {
            if (b.pushCount !== a.pushCount) return b.pushCount - a.pushCount;
            return a.addedAt - b.addedAt;
        });
    }

    /** Get current (first) clip */
    function current() {
        return items[0] || null;
    }

    /** Move to next clip: removes current, adds to memory & history */
    function next() {
        if (items.length === 0) return null;
        const played = items.shift();
        ClipQ.Memory.add(played.url);
        played.watchedAt = Date.now(); // Track when it was watched
        history.push(played);
        saveHistory();
        notifyUpdate();
        return current();
    }

    /** Get previous clip from history (for replay, doesn't modify queue) */
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
    return { getItems, getHistory, getCount, isQueueOpen, setOpen, addClip, current, next, previousFromHistory, removeById, clear, clearHistory, setUpdateCallback, loadHistory, cleanupHistory };
})();
