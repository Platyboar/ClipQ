/**
 * backup.js — JSON backup export and validated restore/import for settings, history, and memory
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Backup = (() => {
    'use strict';

    function setStorageValue(key, val) {
        try {
            if (val === null || val === undefined) localStorage.removeItem(key);
            else localStorage.setItem(key, val);
        } catch { /* ignore storage quota errors */ }
    }

    function writeJsonStorage(key, value) {
        setStorageValue(key, (value === null || value === undefined) ? null : JSON.stringify(value));
    }

    async function exportData() {
        let payload = null;
        if (ClipQ.Sync && ClipQ.Sync.fetchExportSnapshot) {
            payload = await ClipQ.Sync.fetchExportSnapshot();
        }
        if (!payload) {
            payload = {
                exportedAt: new Date().toISOString(),
                config: ClipQ.Sync && ClipQ.Sync.buildLocalConfig ? ClipQ.Sync.buildLocalConfig() : {},
                history: ClipQ.Queue ? ClipQ.Queue.getHistory() : [],
                memory: (() => {
                    try {
                        const parsed = JSON.parse(localStorage.getItem('clipq_memory') || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                })(),
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

    function parseBackupPayload(rawText) {
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            return null;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const hasConfig = parsed.config && typeof parsed.config === 'object' && !Array.isArray(parsed.config);
        const hasHistory = Array.isArray(parsed.history);
        const hasMemory = Array.isArray(parsed.memory);
        if (!hasConfig && !hasHistory && !hasMemory) return null;

        const cfg = hasConfig ? parsed.config : null;
        const nextHistory = hasHistory
            ? parsed.history.filter((item) => item && typeof item === 'object' && !Array.isArray(item))
            : [];
        const nextMemory = hasMemory
            ? parsed.memory.filter((key) => typeof key === 'string' && key.trim()).map((key) => key.trim())
            : [];

        return { hasConfig, config: cfg, hasHistory, history: nextHistory, hasMemory, memory: nextMemory };
    }

    function applyConfigToLocal(cfg) {
        if (!cfg) return;
        if (typeof cfg.language === 'string' && ClipQ.I18n) {
            ClipQ.I18n.setLanguage(cfg.language);
        }
        if (Object.prototype.hasOwnProperty.call(cfg, 'autoplay')) {
            setStorageValue('clipq_autoplay', cfg.autoplay ? 'true' : 'false');
        }
        if (Object.prototype.hasOwnProperty.call(cfg, 'customDesign')) {
            writeJsonStorage('clipq_custom_defaults', cfg.customDesign || null);
        }
        if (Object.prototype.hasOwnProperty.call(cfg, 'customLayout')) {
            writeJsonStorage('clipq_layout_custom_defaults', cfg.customLayout || null);
        }
        if (cfg.settings && typeof cfg.settings === 'object' && !Array.isArray(cfg.settings)) {
            writeJsonStorage('clipq_settings', cfg.settings);
        }
        if (Object.prototype.hasOwnProperty.call(cfg, 'queue')) {
            writeJsonStorage('clipq_queue', cfg.queue || null);
        }
    }

    async function importData(rawText) {
        const normalized = parseBackupPayload(rawText);
        if (!normalized) return false;

        if (normalized.hasConfig) applyConfigToLocal(normalized.config);
        if (normalized.hasMemory && ClipQ.Memory) {
            ClipQ.Memory.applyCloudSnapshot(normalized.memory);
        }
        if (normalized.hasHistory && ClipQ.Queue) {
            const queueSnapshot = normalized.hasConfig ? normalized.config.queue : ClipQ.Queue.getItems();
            const qPayload = Array.isArray(queueSnapshot) ? { items: queueSnapshot } : queueSnapshot;
            ClipQ.Queue.applyCloudSnapshot(qPayload || null, normalized.history);
        }
        if (ClipQ.App && ClipQ.App.applyRemoteConfig) {
            ClipQ.App.applyRemoteConfig();
        }
        if (ClipQ.Sync && ClipQ.Sync.applyImportedBackup) {
            await ClipQ.Sync.applyImportedBackup(normalized);
        }
        return true;
    }

    return { exportData, importData };
})();
