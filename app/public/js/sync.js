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
    let activeObsKey = null;
    let accountObsKey = null;
    let lastSyncedConfigJson = null;

    function getToken() {
        return ClipQ.Auth && ClipQ.Auth.getToken ? ClipQ.Auth.getToken() : null;
    }

    function readStorage(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    }

    function setStorage(key, val) {
        try {
            if (val === null || val === undefined) localStorage.removeItem(key);
            else localStorage.setItem(key, val);
        } catch { /* ignore storage errors */ }
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    }

    function writeJson(key, value) {
        setStorage(key, (value === null || value === undefined) ? null : JSON.stringify(value));
    }

    function clearCachedState(includeOwner) {
        CACHE_KEYS.forEach((key) => setStorage(key, null));
        if (includeOwner) setStorage(OWNER_KEY, null);
    }

    async function checkSyncHealth() {
        const resp = await fetch('/health');
        if (!resp.ok) return false;
        const health = await resp.json();
        return Boolean(health && health.sync === true);
    }

    function fireSync(path, method, payload) {
        if (!available || !ready || suppressPush) return;
        const opts = payload ? { method, body: JSON.stringify(payload) } : { method };
        authFetch(path, opts).catch(() => {});
    }

    async function authFetch(path, options = {}) {
        const headers = new Headers(options.headers || {});
        if (activeObsKey) {
            headers.set('X-ClipQ-Obs-Key', activeObsKey);
        } else {
            const token = getToken();
            if (!token) return null;
            headers.set('Authorization', `Bearer ${token}`);
        }
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

    function serializeCoreConfig(payload) {
        return JSON.stringify(payload);
    }

    function hasConfigChanged() {
        return lastSyncedConfigJson === null || serializeCoreConfig(buildConfigPayload()) !== lastSyncedConfigJson;
    }

    async function pushConfigNow(useKeepalive = false) {
        if (!available || !ready || suppressPush) return;
        const corePayload = buildConfigPayload();
        const coreJson = serializeCoreConfig(corePayload);
        if (lastSyncedConfigJson !== null && coreJson === lastSyncedConfigJson) return;

        const wirePayload = { ...corePayload };
        const user = !activeObsKey && ClipQ.Auth && ClipQ.Auth.getUser ? ClipQ.Auth.getUser() : null;
        if (user) {
            wirePayload.profile = { displayName: user.displayName || user.login || '', avatar: user.avatar || '' };
        }
        if (ClipQ.SyncLive && ClipQ.SyncLive.getClientId) {
            wirePayload.clientId = ClipQ.SyncLive.getClientId();
        }
        const body = JSON.stringify(wirePayload);
        try {
            const resp = await authFetch('/api/sync/config', { method: 'PUT', body, keepalive: Boolean(useKeepalive) });
            if (resp && resp.ok) lastSyncedConfigJson = coreJson;
        } catch {
            if (useKeepalive) {
                try {
                    const retry = await authFetch('/api/sync/config', { method: 'PUT', body });
                    if (retry && retry.ok) lastSyncedConfigJson = coreJson;
                } catch { /* ignore transient offline errors */ }
            }
        }
    }

    function scheduleConfigSave(immediate = false) {
        if (!available || !ready || suppressPush) return Promise.resolve();
        if (configTimer) {
            clearTimeout(configTimer);
            configTimer = null;
        }
        if (!hasConfigChanged()) return Promise.resolve();
        if (immediate) return pushConfigNow(false);
        configTimer = setTimeout(() => {
            configTimer = null;
            pushConfigNow(false);
        }, CONFIG_DEBOUNCE_MS);
        return Promise.resolve();
    }

    function flushPendingConfig() {
        if (!configTimer) return;
        clearTimeout(configTimer);
        configTimer = null;
        pushConfigNow(true);
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

    function applyCloudState(data, options = {}) {
        const config = data.config || null;
        if (config) {
            if (typeof config.language === 'string' && config.language) {
                setStorage('clipq_language', config.language);
                if (ClipQ.I18n?.setLanguage) ClipQ.I18n.setLanguage(config.language);
            }
            setStorage('clipq_autoplay', config.autoplay ? 'true' : 'false');
            writeJson('clipq_custom_defaults', config.customDesign || null);
            writeJson('clipq_layout_custom_defaults', config.customLayout || null);
            const hasSettings = config.settings && typeof config.settings === 'object' && Object.keys(config.settings).length > 0;
            writeJson('clipq_settings', hasSettings ? config.settings : null);
        }
        if (options.configOnly) {
            if (config && ClipQ.Queue?.applyRemoteQueue) ClipQ.Queue.applyRemoteQueue(config.queue);
            return;
        }
        if (ClipQ.Memory?.applyCloudSnapshot) ClipQ.Memory.applyCloudSnapshot(Array.isArray(data.memory) ? data.memory : []);
        if (ClipQ.Queue?.applyCloudSnapshot) {
            ClipQ.Queue.applyCloudSnapshot(config ? config.queue : null, Array.isArray(data.history) ? data.history : []);
        }
    }

    async function pullRemoteConfig() {
        if (!available || !ready) return;
        try {
            const resp = await authFetch('/api/sync?configOnly=1');
            if (!resp || !resp.ok) return;
            const data = await resp.json();
            if (!data || !data.config) return;
            suppressPush = true;
            try {
                applyCloudState({ config: data.config }, { configOnly: true });
                lastSyncedConfigJson = serializeCoreConfig(buildConfigPayload());
            } finally {
                suppressPush = false;
            }
            if (ClipQ.App && ClipQ.App.applyRemoteConfig) {
                ClipQ.App.applyRemoteConfig();
            }
        } catch { /* ignore transient remote sync failures */ }
    }

    function connectLiveSync() {
        const wsKey = activeObsKey || accountObsKey;
        if (!available || !wsKey || !ClipQ.SyncLive) return;
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/api/sync/ws?obsKey=${encodeURIComponent(wsKey)}`;
        ClipQ.SyncLive.connect(wsUrl, pullRemoteConfig);
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
        activeObsKey = null;
        accountObsKey = null;
        lastSyncedConfigJson = null;
        if (ClipQ.SyncLive) ClipQ.SyncLive.disconnect();
        const token = getToken();
        if (!token) return false;

        try {
            if (!(await checkSyncHealth())) return false;
            const resp = await authFetch(`/api/sync?limit=${HISTORY_PAGE_SIZE}`);
            if (!resp || !resp.ok) return false;
            const data = await resp.json();

            available = true;
            accountObsKey = typeof data.obsKey === 'string' && data.obsKey ? data.obsKey : null;
            const userId = String(user?.id || data.userId || '');
            const previousOwner = readStorage(OWNER_KEY);

            suppressPush = true;
            try {
                if (data.exists) {
                    applyCloudState(data);
                    lastSyncedConfigJson = serializeCoreConfig(buildConfigPayload());
                    ready = true;
                } else {
                    ready = true;
                    const differentUser = Boolean(previousOwner && userId && previousOwner !== userId);
                    await seedInitialCloudData(differentUser);
                }
                if (userId) setStorage(OWNER_KEY, userId);
            } finally {
                suppressPush = false;
            }

            if (data.exists && data.hasMoreHistory && Array.isArray(data.history)) {
                loadRemainingHistory(data.history.length);
            }
            connectLiveSync();
            return true;
        } catch {
            available = false;
            ready = false;
            return false;
        }
    }

    function recordHistoryClip(item) {
        if (item) fireSync('/api/sync/history', 'POST', { items: [item] });
    }

    function deleteHistoryClip(id) {
        if (id) fireSync(`/api/sync/history?id=${encodeURIComponent(id)}`, 'DELETE');
    }

    function clearHistory() { fireSync('/api/sync/history', 'DELETE'); }

    function pruneHistoryBefore(cutoff) {
        if (cutoff) fireSync(`/api/sync/history?before=${encodeURIComponent(cutoff)}`, 'DELETE');
    }

    function recordMemoryKey(key) {
        if (key) fireSync('/api/sync/memory', 'POST', { keys: [key] });
    }

    function clearMemory() { fireSync('/api/sync/memory', 'DELETE'); }

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

    async function initObsSession(urlKey) {
        available = false;
        ready = false;
        activeObsKey = null;
        accountObsKey = null;
        lastSyncedConfigJson = null;
        if (ClipQ.SyncLive) ClipQ.SyncLive.disconnect();
        if (!urlKey) return { ok: false, invalid: true };

        try {
            if (!(await checkSyncHealth())) return { ok: false, syncDisabled: true };

            activeObsKey = urlKey;
            const resp = await authFetch(`/api/sync?limit=${HISTORY_PAGE_SIZE}`);
            if (!resp || resp.status === 401 || resp.status === 403) {
                activeObsKey = null;
                return { ok: false, invalid: Boolean(resp) };
            }
            if (!resp.ok) {
                activeObsKey = null;
                return { ok: false };
            }

            const data = await resp.json();
            const obsUser = {
                id: String(data.userId || ''),
                login: String(data.login || ''),
                displayName: String(data.displayName || data.login || ''),
                avatar: String(data.avatar || ''),
            };
            if (!obsUser.id || !obsUser.login) {
                activeObsKey = null;
                return { ok: false, invalid: true };
            }

            if (ClipQ.Auth?.setActiveObsKey) ClipQ.Auth.setActiveObsKey(urlKey);
            available = true;
            suppressPush = true;
            try {
                if (data.exists) applyCloudState(data);
                else {
                    clearCachedState(false);
                    ClipQ.Memory?.applyCloudSnapshot?.([]);
                    ClipQ.Queue?.applyCloudSnapshot?.(null, []);
                }
                lastSyncedConfigJson = serializeCoreConfig(buildConfigPayload());
                ready = true;
                setStorage(OWNER_KEY, obsUser.id);
            } finally { suppressPush = false; }

            if (data.exists && data.hasMoreHistory && Array.isArray(data.history)) loadRemainingHistory(data.history.length);
            connectLiveSync();
            return { ok: true, user: obsUser };
        } catch {
            activeObsKey = null;
            available = false;
            ready = false;
            return { ok: false };
        }
    }

    function getObsKey() { return accountObsKey; }

    async function regenerateObsKey() {
        if (!available || activeObsKey) return null;
        try {
            const user = ClipQ.Auth && ClipQ.Auth.getUser ? ClipQ.Auth.getUser() : null;
            const resp = await authFetch('/api/sync/obs-key', {
                method: 'POST',
                body: JSON.stringify({
                    displayName: user?.displayName || user?.login || '',
                    avatar: user?.avatar || '',
                }),
            });
            if (!resp || !resp.ok) return null;
            const data = await resp.json();
            if (typeof data?.obsKey === 'string' && data.obsKey) {
                accountObsKey = data.obsKey;
                connectLiveSync();
                return accountObsKey;
            }
        } catch { /* ignore network errors */ }
        return null;
    }

    async function deleteAllCloudData() {
        if (!available) return false;
        try {
            const resp = await authFetch('/api/sync', { method: 'DELETE' });
            if (!resp || !resp.ok) return false;
            if (ClipQ.SyncLive) ClipQ.SyncLive.disconnect();
            clearCachedState(true);
            available = false;
            ready = false;
            activeObsKey = null;
            accountObsKey = null;
            lastSyncedConfigJson = null;
            return true;
        } catch {
            return false;
        }
    }

    function isAvailable() {
        return available;
    }

    window.addEventListener('pagehide', flushPendingConfig);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushPendingConfig();
    });

    return {
        init,
        initObsSession,
        getObsKey,
        regenerateObsKey,
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
