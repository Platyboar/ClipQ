/**
 * memory.js — Clip Memory (persists seen clip URLs to prevent re-queuing)
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Memory = (() => {
    const STORAGE_KEY = 'clipq_memory';

    function getAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch { return []; }
    }

    function save(urls) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
    }

    function has(url) {
        return getAll().includes(url);
    }

    function add(url) {
        const urls = getAll();
        if (!urls.includes(url)) {
            urls.push(url);
            save(urls);
        }
    }

    function count() {
        return getAll().length;
    }

    function purge() {
        save([]);
    }

    return { has, add, count, purge, getAll };
})();
