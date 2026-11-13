/**
 * memory.js — Clip Memory (persists seen clip keys/URLs to prevent re-queuing)
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Memory = (() => {
    'use strict';

    const STORAGE_KEY = 'clipq_memory';
    // Cache parsed entries and a lookup Set in memory to avoid repeated JSON.parse/O(n) scans per URL.
    let entriesCache = null;
    let entrySet = null;

    function ensureLoaded() {
        if (entriesCache !== null) return;
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            entriesCache = Array.isArray(parsed) ? parsed : [];
        } catch {
            entriesCache = [];
        }
        entrySet = new Set(entriesCache);
    }

    function save(entries) {
        entriesCache = entries;
        entrySet = new Set(entries);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        } catch { /* ignore storage quota errors */ }
    }

    function makeCanonicalKey(provider, clipId) {
        return provider && clipId ? `${provider}:${clipId}` : null;
    }

    function has(url, provider, clipId) {
        ensureLoaded();
        const key = makeCanonicalKey(provider, clipId);
        if (key && entrySet.has(key)) return true;
        return !!(url && entrySet.has(url));
    }

    function add(url, provider, clipId) {
        ensureLoaded();
        const entry = makeCanonicalKey(provider, clipId) || url;
        if (!entry) return;
        if (!entrySet.has(entry) && !(url && entrySet.has(url))) {
            entriesCache.push(entry);
            entrySet.add(entry);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(entriesCache));
            } catch { /* ignore storage quota errors */ }
        }
    }

    function count() {
        ensureLoaded();
        return entriesCache.length;
    }

    function purge() {
        save([]);
    }

    return { has, add, count, purge };
})();
