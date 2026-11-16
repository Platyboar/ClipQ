/**
 * sync.js — Optional Cloudflare Worker + D1 persistence synchronized per verified Twitch account
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Sync = (() => {
    'use strict';

    const OWNER_KEY = 'clipq_sync_owner';
    const CONFIG_DEBOUNCE_MS = 600;
    const HISTORY_PAGE_SIZE = 1000;
    const CACHE_KEYS = [
        'clipq_settings',
        'clipq_custom_defaults',
        'clipq_layout_custom_defaults',
        'clipq_queue',
        'clipq_history',
        'clipq_memory',
        'clipq_autoplay',
    ];

    let available = false;
    let ready = false;
    let suppressPush = false;
    let configTimer = null;

    function getToken() {
        return ClipQ.Auth && ClipQ.Auth.getToken ? ClipQ.Auth.getToken() : null;
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            if (value === null || value === undefined) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        } catch { /* ignore storage quota errors */ }
    }

    function clearCachedState(includeOwner) {
        CACHE_KEYS.forEach((key) => {
            try {
                localStorage.removeItem(key);
            } catch { /* ignore storage errors */ }
        });
        if (includeOwner) {
            try {
                localStorage.removeItem(OWNER_KEY);
            } catch { /* ignore storage errors */ }
        }
    }

    async function authFetch(path, options = {}) {
        const token = getToken();
        if (!token) return null;
        const headers = new Headers(options.headers || {});
        headers.set('Authorization', `Bearer ${token}`);
        if (options.body && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        return fetch(path, { ...options, headers });
    }

    function buildConfigPayload() {
        let autoplayVal = false;
        let langVal = 'en';
        try {
            autoplayVal = localStorage.getItem('clipq_autoplay') === 'true';
            langVal = localStorage.getItem('clipq_language') || (ClipQ.I18n ? ClipQ.I18n.getLanguage() : 'en');
        } catch { /* ignore storage errors */ }
        return {
            settings: readJson('clipq_settings', {}),
            customDesign: readJson('clipq_custom_defaults', null),
            customLayout: readJson('clipq_layout_custom_defaults', null),
            queue: readJson('clipq_queue', null),
            language: langVal,
            autoplay: autoplayVal,
        };
    }

    async function pushConfigNow() {
        if (!available || !ready || suppressPush) return;
        try {
            await authFetch('/api/sync/config', {
                method: 'PUT',
                body: JSON.stringify(buildConfigPayload()),
            });
        } catch { /* ignore transient offline errors */ }
    }

    function scheduleConfigSave(immediate = false) {
        if (!available || !ready || suppressPush) return Promise.resolve();
        if (configTimer) {
            clearTimeout(configTimer);
            configTimer = null;
        }
        if (immediate) {
            return pushConfigNow();
        }
        configTimer = setTimeout(() => {
            configTimer = null;
            pushConfigNow();
        }, CONFIG_DEBOUNCE_MS);
        return Promise.resolve();
    }

    async function pushBatch(path, payloadBuilder, items, chunkSize) {
        if (!available || !items || items.length === 0) return;
        for (let i = 0; i < items.length; i += chunkSize) {
            const slice = items.slice(i, i + chunkSize);
            try {
                await authFetch(path, {
                    method: 'POST',
                    body: JSON.stringify(payloadBuilder(slice)),
                });
            } catch { /* ignore transient sync errors */ }
        }
    }

    function applyCloudState(data) {
        const config = data.config || null;
        if (config) {
            if (typeof config.language === 'string' && config.language) {
                try {
                    localStorage.setItem('clipq_language', config.language);
                } catch { /* ignore storage errors */ }
                if (ClipQ.I18n && ClipQ.I18n.setLanguage) {
                    ClipQ.I18n.setLanguage(config.language);
                }
            }
            try {
                localStorage.setItem('clipq_autoplay', config.autoplay ? 'true' : 'false');
            } catch { /* ignore storage errors */ }
            writeJson('clipq_custom_defaults', config.customDesign || null);
            writeJson('clipq_layout_custom_defaults', config.customLayout || null);
            if (config.settings && typeof config.settings === 'object' && Object.keys(config.settings).length > 0) {
                writeJson('clipq_settings', config.settings);
            } else {
                writeJson('clipq_settings', null);
            }
        }
        if (ClipQ.Memory && ClipQ.Memory.applyCloudSnapshot) {
            ClipQ.Memory.applyCloudSnapshot(Array.isArray(data.memory) ? data.memory : []);
        }
        if (ClipQ.Queue && ClipQ.Queue.applyCloudSnapshot) {
            ClipQ.Queue.applyCloudSnapshot(config ? config.queue : null, Array.isArray(data.history) ? data.history : []);
        }
    }

    async function loadRemainingHistory(initialCount) {
        let offset = initialCount;
        let hasMore = true;
        while (hasMore && available) {
            try {
                const resp = await authFetch(`/api/sync/history?offset=${offset}&limit=${HISTORY_PAGE_SIZE}`);
                if (!resp || !resp.ok) break;
                const page = await resp.json();
                const items = Array.isArray(page.items) ? page.items : [];
                if (items.length > 0 && ClipQ.Queue && ClipQ.Queue.prependCloudHistory) {
                    ClipQ.Queue.prependCloudHistory(items);
                    if (ClipQ.App && ClipQ.App.renderHistory) ClipQ.App.renderHistory();
                    const countEl = document.getElementById('history-count-text');
                    if (countEl && ClipQ.I18n) {
                        countEl.innerHTML = ClipQ.I18n.t('settings.history.count', { count: ClipQ.Queue.getHistory().length });
                    }
                }
                hasMore = Boolean(page.hasMore && items.length > 0);
                offset += items.length;
            } catch {
                break;
            }
        }
    }

    async function seedInitialCloudData(resetLocal) {
        if (resetLocal) {
            clearCachedState(false);
            if (ClipQ.Memory && ClipQ.Memory.applyCloudSnapshot) ClipQ.Memory.applyCloudSnapshot([]);
            if (ClipQ.Queue && ClipQ.Queue.applyCloudSnapshot) ClipQ.Queue.applyCloudSnapshot(null, []);
        }
        await pushConfigNow();
        if (!resetLocal) {
            const localHistory = ClipQ.Queue ? ClipQ.Queue.getHistory() : [];
            const localMemory = readJson('clipq_memory', []);
            await pushBatch('/api/sync/history', (slice) => ({ items: slice }), localHistory, 50);
            await pushBatch('/api/sync/memory', (slice) => ({ keys: slice }), Array.isArray(localMemory) ? localMemory : [], 100);
        }
    }

    async function init(user) {
        available = false;
        ready = false;
        const token = getToken();
        if (!token) return false;

        try {
            const healthResp = await fetch('/health');
            if (!healthResp.ok) return false;
            const health = await healthResp.json();
            if (!health || health.sync !== true) return false;

            const resp = await authFetch(`/api/sync?limit=${HISTORY_PAGE_SIZE}`);
            if (!resp || !resp.ok) return false;
            const data = await resp.json();

            available = true;
            const userId = String(user?.id || data.userId || '');
            let previousOwner = null;
            try {
                previousOwner = localStorage.getItem(OWNER_KEY);
            } catch { /* ignore storage errors */ }

            suppressPush = true;
            try {
                if (data.exists) {
                    applyCloudState(data);
                    ready = true;
                } else {
                    ready = true;
                    const differentUser = Boolean(previousOwner && userId && previousOwner !== userId);
                    await seedInitialCloudData(differentUser);
                }
                if (userId) {
                    try {
                        localStorage.setItem(OWNER_KEY, userId);
                    } catch { /* ignore storage errors */ }
                }
            } finally {
                suppressPush = false;
            }

            if (data.exists && data.hasMoreHistory && Array.isArray(data.history)) {
                loadRemainingHistory(data.history.length);
            }
            return true;
        } catch {
            available = false;
            ready = false;
            return false;
        }
    }

    function recordHistoryClip(item) {
        if (!available || !ready || suppressPush || !item) return;
        authFetch('/api/sync/history', {
            method: 'POST',
            body: JSON.stringify({ items: [item] }),
        }).catch(() => {});
    }

    function deleteHistoryClip(id) {
        if (!available || !ready || suppressPush || !id) return;
        authFetch(`/api/sync/history?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }

    function clearHistory() {
        if (!available || !ready || suppressPush) return;
        authFetch('/api/sync/history', { method: 'DELETE' }).catch(() => {});
    }

    function pruneHistoryBefore(cutoff) {
        if (!available || !ready || suppressPush || !cutoff) return;
        authFetch(`/api/sync/history?before=${encodeURIComponent(cutoff)}`, { method: 'DELETE' }).catch(() => {});
    }

    function recordMemoryKey(key) {
        if (!available || !ready || suppressPush || !key) return;
        authFetch('/api/sync/memory', {
            method: 'POST',
            body: JSON.stringify({ keys: [key] }),
        }).catch(() => {});
    }

    function clearMemory() {
        if (!available || !ready || suppressPush) return;
        authFetch('/api/sync/memory', { method: 'DELETE' }).catch(() => {});
    }

    async function exportBackup() {
        let payload = null;
        if (available) {
            try {
                const resp = await authFetch('/api/sync/export');
                if (resp && resp.ok) payload = await resp.json();
            } catch { /* fallback to local snapshot */ }
        }
        if (!payload) {
            payload = {
                exportedAt: new Date().toISOString(),
                config: buildConfigPayload(),
                history: ClipQ.Queue ? ClipQ.Queue.getHistory() : [],
                memory: readJson('clipq_memory', []),
            };
        }
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `clipq-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }

    async function deleteAllCloudData() {
        if (!available) return false;
        try {
            const resp = await authFetch('/api/sync', { method: 'DELETE' });
            if (!resp || !resp.ok) return false;
            clearCachedState(true);
            available = false;
            ready = false;
            return true;
        } catch {
            return false;
        }
    }

    function isAvailable() {
        return available;
    }

    return {
        init,
        isAvailable,
        scheduleConfigSave,
        recordHistoryClip,
        deleteHistoryClip,
        clearHistory,
        pruneHistoryBefore,
        recordMemoryKey,
        clearMemory,
        exportBackup,
        deleteAllCloudData,
    };
})();
