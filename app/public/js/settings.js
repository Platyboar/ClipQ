/**
 * settings.js - Settings persistence, validation, and modal controller
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Settings = (() => {
    'use strict';

    const STORAGE_KEY = 'clipq_settings';
    let current = null;

    function cloneDefaultSettings() {
        return {
            channel: '',
            appTitle: 'ClipQ',
            providers: { twitch: true, twitch_vod: true, youtube: true, tiktok: true, instagram: true },
            userClipLimit: 0,
            ageLimitDays: 0,
            historyRetentionDays: 0,
            blockedUsers: ['streamlabs', 'nightbot', 'streamelements', 'fossabot', 'moobot'],
            blockedStreamers: [],
            commands: ClipQ.SettingsCommands.cloneDefaults(),
            memory: {
                bypassRoles: { leadMod: true, mod: false }
            },
            design: { colors: {}, fontFamily: 'Inter', showBadges: true },
            layout: ClipQ.SettingsLayout.getDefaultLayout()
        };
    }

    function load() {
        const base = cloneDefaultSettings();
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && typeof saved === 'object') {
                current = {
                    ...base,
                    ...saved,
                    appTitle: saved.appTitle || base.appTitle,
                    providers: { ...base.providers, ...(saved.providers || {}) },
                    blockedUsers: Array.isArray(saved.blockedUsers) ? [...saved.blockedUsers] : base.blockedUsers,
                    blockedStreamers: Array.isArray(saved.blockedStreamers) ? [...saved.blockedStreamers] : base.blockedStreamers,
                    commands: ClipQ.SettingsCommands.migrate(saved.commands),
                    memory: {
                        ...base.memory,
                        ...(saved.memory || {}),
                        bypassRoles: {
                            ...base.memory.bypassRoles,
                            ...(saved.memory?.bypassRoles || {})
                        }
                    },
                    design: {
                        ...base.design,
                        ...(saved.design || {}),
                        colors: { ...(saved.design?.colors || {}) }
                    },
                    layout: {
                        ...base.layout,
                        ...(saved.layout || {}),
                        order: Array.isArray(saved.layout?.order) ? [...saved.layout.order] : base.layout.order
                    }
                };
            } else {
                current = base;
            }
        } catch {
            current = base;
        }

        if (current.design && ClipQ.Design) ClipQ.Design.applyAll(current.design);
        if (current.layout && ClipQ.Layout) ClipQ.Layout.apply(current.layout);
        return current;
    }

    function save(settings) {
        current = settings;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch { /* ignore storage quota errors */ }
        if (ClipQ.Sync) ClipQ.Sync.scheduleConfigSave();
    }

    function get() {
        if (!current) load();
        return current;
    }

    function isUserBlocked(username) {
        if (!username) return false;
        const normalized = username.toLowerCase().trim();
        return get().blockedUsers.some(u => u.toLowerCase().trim() === normalized);
    }

    function isStreamerBlocked(channelName) {
        if (!channelName) return false;
        const normalized = channelName.replace(/^@/, '').toLowerCase().trim();
        return get().blockedStreamers.some(s => s.replace(/^@/, '').toLowerCase().trim() === normalized);
    }

    /**
     * Check whether a user role is permitted to run a given command.
     */
    function hasCommandPermission(cmdKey, userRoles) {
        const cmd = get().commands[cmdKey];
        if (!cmd || !cmd.roles) return false;
        const r = cmd.roles;

        if (r.all) return true;
        if (r.broadcaster && userRoles.isBroadcaster) return true;
        if (r.leadMod && userRoles.isLeadMod) return true;
        if (r.mod && userRoles.isMod) return true;
        if (r.vip && userRoles.isVip) return true;
        return false;
    }

    function populateUI() {
        const s = get();
        const t = ClipQ.I18n.t.bind(ClipQ.I18n);

        if (ClipQ.Design) ClipQ.Design.saveOriginalValues();

        const channelText = document.getElementById('set-channel-text');
        if (channelText) channelText.textContent = s.channel || '';
        const deleteCloudBtn = document.getElementById('settings-delete-cloud');
        if (deleteCloudBtn) {
            deleteCloudBtn.classList.toggle('hidden', !(ClipQ.Sync && ClipQ.Sync.isAvailable()));
        }
        document.getElementById('set-app-title').value = s.appTitle || 'ClipQ';

        const langSelect = document.getElementById('set-language');
        langSelect.innerHTML = '';
        ClipQ.I18n.getAvailableLanguages().forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang.code;
            opt.textContent = lang.name;
            opt.selected = lang.code === ClipQ.I18n.getLanguage();
            langSelect.appendChild(opt);
        });

        document.getElementById('set-user-clip-limit').value = s.userClipLimit || 0;
        document.getElementById('set-age-limit').value = s.ageLimitDays || 0;
        document.getElementById('set-history-retention').value = s.historyRetentionDays || 0;
        document.getElementById('set-blocked-users').value = s.blockedUsers.join('\n');
        document.getElementById('set-blocked-streamers').value = s.blockedStreamers.join('\n');

        document.querySelectorAll('.provider-chip').forEach(chip => {
            const active = !!s.providers[chip.dataset.provider];
            chip.classList.toggle('active', active);
            chip.setAttribute('aria-pressed', String(active));
        });

        ClipQ.SettingsCommands.populateUI(s.commands);

        const memoryRolesContainer = document.getElementById('memory-bypass-roles');
        if (memoryRolesContainer) {
            const bypassRoles = s.memory?.bypassRoles || { leadMod: true, mod: false };
            memoryRolesContainer.querySelectorAll('.role-badge').forEach(badge => {
                const active = !!bypassRoles[badge.dataset.role];
                badge.classList.toggle('active', active);
                badge.setAttribute('aria-pressed', String(active));
            });
        }

        document.getElementById('memory-count-text').innerHTML =
            t('settings.memory.count', { count: ClipQ.Memory.count() });
        document.getElementById('history-count-text').innerHTML =
            t('settings.history.count', { count: ClipQ.Queue.getHistory().length });

        ClipQ.setToggleState('design-show-badges', s.design.showBadges !== false);
        if (ClipQ.Design) ClipQ.Design.populate(s.design);
        if (s.layout) ClipQ.SettingsLayout.applyToUI(s.layout);
    }

    function readFromUI() {
        const providers = {};
        document.querySelectorAll('.provider-chip').forEach(chip => {
            providers[chip.dataset.provider] = chip.classList.contains('active');
        });

        const bypassRoles = {};
        const memoryRolesContainer = document.getElementById('memory-bypass-roles');
        if (memoryRolesContainer) {
            memoryRolesContainer.querySelectorAll('.role-badge').forEach(badge => {
                bypassRoles[badge.dataset.role] = badge.classList.contains('active');
            });
        }

        const designVals = ClipQ.Design ? ClipQ.Design.readValues() : { colors: {}, fontFamily: 'Inter' };
        designVals.showBadges = ClipQ.getToggleState('design-show-badges');

        return {
            channel: get().channel,
            appTitle: document.getElementById('set-app-title').value.trim() || 'ClipQ',
            providers,
            userClipLimit: Math.max(0, ClipQ.intOrDefault(document.getElementById('set-user-clip-limit').value, 0)),
            ageLimitDays: Math.max(0, ClipQ.intOrDefault(document.getElementById('set-age-limit').value, 0)),
            historyRetentionDays: Math.max(0, ClipQ.intOrDefault(document.getElementById('set-history-retention').value, 0)),
            blockedUsers: document.getElementById('set-blocked-users').value.split('\n').map(u => u.trim()).filter(Boolean),
            blockedStreamers: document.getElementById('set-blocked-streamers').value.split('\n').map(u => u.trim()).filter(Boolean),
            commands: ClipQ.SettingsCommands.readFromUI(),
            memory: { bypassRoles },
            design: designVals,
            layout: ClipQ.SettingsLayout.readFromUI()
        };
    }

    function applyAndSave() {
        const newSettings = readFromUI();
        save(newSettings);

        const selectedLang = document.getElementById('set-language').value;
        if (selectedLang !== ClipQ.I18n.getLanguage()) {
            ClipQ.I18n.setLanguage(selectedLang);
            if (ClipQ.Design && ClipQ.Design.renderSwatches) ClipQ.Design.renderSwatches();
            ClipQ.SettingsLayout.renderOrderingUI();
            if (ClipQ.App.renderQueueList) ClipQ.App.renderQueueList();
            if (ClipQ.App.renderHistory) ClipQ.App.renderHistory();
            if (ClipQ.App.updateNextButton) ClipQ.App.updateNextButton();
            if (ClipQ.Player && ClipQ.Player.refreshLanguage) ClipQ.Player.refreshLanguage();
        }

        const titleEl = document.getElementById('app-title');
        if (titleEl) titleEl.textContent = newSettings.appTitle || 'ClipQ';

        if (newSettings.layout && ClipQ.Layout) ClipQ.Layout.apply(newSettings.layout);

        if (ClipQ.Queue.cleanupHistory()) {
            if (ClipQ.Player && ClipQ.Player.showEmpty) ClipQ.Player.showEmpty();
            if (ClipQ.App && ClipQ.App.updateNextButton) ClipQ.App.updateNextButton();
        }
        if (ClipQ.App && ClipQ.App.renderHistory) ClipQ.App.renderHistory();
        populateUI();
    }

    function closeModal(keepDesign) {
        if (ClipQ.Design) ClipQ.Design.closePicker();
        if (keepDesign !== true) {
            if (ClipQ.Design) ClipQ.Design.revertToOriginal();
            const s = load();
            const titleEl = document.getElementById('app-title');
            if (titleEl) titleEl.textContent = s.appTitle || 'ClipQ';
            if (ClipQ.App.renderQueueList) ClipQ.App.renderQueueList();
        }
        document.getElementById('settings-overlay').classList.add('hidden');
    }

    function initUI() {
        ClipQ.SettingsCommands.renderList();
        if (ClipQ.Design) ClipQ.Design.init();

        const titleInput = document.getElementById('set-app-title');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                const titleEl = document.getElementById('app-title');
                if (titleEl) titleEl.textContent = titleInput.value.trim() || 'ClipQ';
            });
        }

        ClipQ.SettingsCommands.initListeners();
        ClipQ.SettingsLayout.initListeners();

        const badgesSwitch = document.getElementById('design-show-badges');
        if (badgesSwitch) {
            badgesSwitch.addEventListener('click', () => {
                const active = !ClipQ.getToggleState('design-show-badges');
                ClipQ.setToggleState('design-show-badges', active);
                get().design.showBadges = active;
                if (ClipQ.App.renderQueueList) ClipQ.App.renderQueueList();
            });
        }

        document.querySelectorAll('.modal-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (ClipQ.Design) ClipQ.Design.closePicker();
                document.querySelectorAll('.modal-tabs .tab').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.settings-tab-content').forEach(el => el.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('stab-' + tab.dataset.stab).classList.add('active');
            });
        });

        document.querySelectorAll('.provider-chip, .role-badge').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                btn.setAttribute('aria-pressed', String(btn.classList.contains('active')));
            });
        });

        document.getElementById('purge-memory-btn').addEventListener('click', () => {
            if (confirm(ClipQ.I18n.t('settings.memory.confirm_purge'))) {
                ClipQ.Memory.purge();
                document.getElementById('memory-count-text').innerHTML =
                    ClipQ.I18n.t('settings.memory.count', { count: 0 });
            }
        });

        document.getElementById('purge-history-btn').addEventListener('click', () => {
            if (confirm(ClipQ.I18n.t('settings.history.confirm_purge'))) {
                const clearedPlayback = ClipQ.Queue.clearHistory();
                document.getElementById('history-count-text').innerHTML =
                    ClipQ.I18n.t('settings.history.count', { count: 0 });
                if (clearedPlayback) {
                    if (ClipQ.Player && ClipQ.Player.showEmpty) ClipQ.Player.showEmpty();
                    if (ClipQ.App && ClipQ.App.updateNextButton) ClipQ.App.updateNextButton();
                }
                if (ClipQ.App && ClipQ.App.renderHistory) ClipQ.App.renderHistory();
            }
        });

        const settingsLogoutBtn = document.getElementById('settings-logout');
        if (settingsLogoutBtn) {
            settingsLogoutBtn.addEventListener('click', () => ClipQ.Auth.logout());
        }

        document.getElementById('settings-close').addEventListener('click', () => closeModal(false));
        document.getElementById('settings-cancel').addEventListener('click', () => closeModal(false));

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const overlay = document.getElementById('settings-overlay');
            if (!overlay || overlay.classList.contains('hidden')) return;
            if (document.querySelector('.color-picker-popup') && ClipQ.Design) {
                ClipQ.Design.closePicker();
            } else {
                closeModal(false);
            }
        });

        document.getElementById('settings-save').addEventListener('click', () => applyAndSave());
        document.getElementById('settings-save-close').addEventListener('click', () => {
            applyAndSave();
            closeModal(true);
        });

        const exportBtn = document.getElementById('settings-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (ClipQ.Sync) ClipQ.Sync.exportBackup();
            });
        }

        const deleteCloudBtn = document.getElementById('settings-delete-cloud');
        if (deleteCloudBtn) {
            deleteCloudBtn.addEventListener('click', async () => {
                const confirmed = await ClipQ.confirmAction({
                    message: ClipQ.I18n.t('settings.general.confirm_delete_cloud'),
                    yesLabel: ClipQ.I18n.t('history.confirm_yes'),
                    cancelLabel: ClipQ.I18n.t('history.confirm_cancel')
                });
                if (!confirmed || !ClipQ.Sync) return;
                const ok = await ClipQ.Sync.deleteAllCloudData();
                if (ok) {
                    alert(ClipQ.I18n.t('settings.general.delete_cloud_done'));
                    ClipQ.Auth.logout();
                } else {
                    alert(ClipQ.I18n.t('settings.general.delete_cloud_error'));
                }
            });
        }

        const settingsResetBtn = document.getElementById('settings-reset');
        if (settingsResetBtn) {
            settingsResetBtn.addEventListener('click', async () => {
                if (!confirm(ClipQ.I18n.t('settings.general.confirm_reset'))) return;
                try {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem('clipq_custom_defaults');
                    localStorage.removeItem('clipq_layout_custom_defaults');
                    localStorage.removeItem('clipq_autoplay');
                } catch { /* ignore storage errors */ }
                current = cloneDefaultSettings();
                if (ClipQ.Sync && ClipQ.Sync.isAvailable()) {
                    await ClipQ.Sync.scheduleConfigSave(true);
                }
                window.location.reload();
            });
        }
    }

    return {
        load,
        save,
        get,
        isUserBlocked,
        isStreamerBlocked,
        hasCommandPermission,
        initUI,
        populateUI
    };
})();
