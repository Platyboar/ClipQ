/**
 * settings.js — Settings persistence and UI logic
 * Supports i18n, command permissions per role, app title, and language selection.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Settings = (() => {
    const STORAGE_KEY = 'clipq_settings';

    const DEFAULT_ROLES = { broadcaster: true, leadMod: true, mod: true, vip: false, all: false };

    const DEFAULTS = {
        channel: '',
        appTitle: 'ClipQ',
        providers: { twitch: true, twitch_vod: true, youtube: true, tiktok: true, instagram: true },
        userClipLimit: 0,
        ageLimitDays: 0,
        historyRetentionDays: 0,
        blockedUsers: ['streamlabs', 'nightbot', 'streamelements', 'fossabot', 'moobot'],
        blockedStreamers: [],
        commands: {
            prefix: '!queue',
            next:        { word: 'next',        roles: { ...DEFAULT_ROLES } },
            push:        { word: 'push',        roles: { ...DEFAULT_ROLES } },
            open:        { word: 'open',        roles: { ...DEFAULT_ROLES } },
            close:       { word: 'close',       roles: { ...DEFAULT_ROLES } },
            clear:       { word: 'clear',       roles: { ...DEFAULT_ROLES } },
            purgememory: { word: 'purgememory', roles: { ...DEFAULT_ROLES } },
            autoplay:    { word: 'autoplay',    roles: { ...DEFAULT_ROLES } },
            limit:       { word: 'limit',       roles: { ...DEFAULT_ROLES } },
            remove:      { word: 'remove',      roles: { ...DEFAULT_ROLES } },
            providers:   { word: 'providers',   roles: { ...DEFAULT_ROLES } },
        },
        design: { colors: {}, fontFamily: 'Inter', showBadges: true }
    };

    /** All command keys (excluding 'prefix') */
    const CMD_KEYS = ['next', 'push', 'open', 'close', 'clear', 'purgememory', 'autoplay', 'limit', 'remove', 'providers'];

    let current = null;

    /**
     * Migrate old flat-string command format to new object format.
     * Old: { skip: 'skip', push: 'push', ... }
     * New: { next: { word: 'next', roles: {...} }, ... }
     */
    function migrateCommands(savedCmds) {
        if (!savedCmds) return { ...DEFAULTS.commands };

        const migrated = { prefix: savedCmds.prefix || DEFAULTS.commands.prefix };

        for (const key of CMD_KEYS) {
            if (savedCmds[key] && typeof savedCmds[key] === 'object' && savedCmds[key].word) {
                // Already new format
                migrated[key] = {
                    word: savedCmds[key].word,
                    roles: { ...DEFAULT_ROLES, ...(savedCmds[key].roles || {}) }
                };
            } else if (typeof savedCmds[key] === 'string') {
                // Old flat string format
                migrated[key] = { word: savedCmds[key], roles: { ...DEFAULT_ROLES } };
            } else {
                migrated[key] = { ...DEFAULTS.commands[key] };
            }
        }

        // Migrate old 'skip' → 'next'
        if (savedCmds.skip && !savedCmds.next) {
            const skipWord = typeof savedCmds.skip === 'string' ? savedCmds.skip : savedCmds.skip.word || 'next';
            const skipRoles = typeof savedCmds.skip === 'object' && savedCmds.skip.roles
                ? { ...DEFAULT_ROLES, ...savedCmds.skip.roles }
                : { ...DEFAULT_ROLES };
            migrated.next = { word: skipWord === 'skip' ? 'next' : skipWord, roles: skipRoles };
        }

        return migrated;
    }

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            current = {
                ...DEFAULTS,
                ...saved,
                appTitle: saved?.appTitle || DEFAULTS.appTitle,
                providers: { ...DEFAULTS.providers, ...(saved?.providers || {}) },
                commands: migrateCommands(saved?.commands),
                blockedStreamers: saved?.blockedStreamers || DEFAULTS.blockedStreamers,
                design: {
                    ...DEFAULTS.design,
                    ...(saved?.design || {}),
                    colors: { ...(saved?.design?.colors || {}) }
                }
            };
        } catch {
            current = { ...DEFAULTS, commands: { ...DEFAULTS.commands } };
        }
        // Apply saved design to CSS variables on load
        if (current.design && ClipQ.Design) ClipQ.Design.applyAll(current.design);
        return current;
    }

    function save(settings) {
        current = settings;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    }

    function get() {
        if (!current) load();
        return current;
    }

    function isUserBlocked(username) {
        return get().blockedUsers.map(u => u.toLowerCase().trim()).includes(username.toLowerCase().trim());
    }

    function isStreamerBlocked(channelName) {
        if (!channelName) return false;
        return get().blockedStreamers.map(s => s.toLowerCase().trim()).includes(channelName.toLowerCase().trim());
    }

    /**
     * Check if a user role is allowed for a given command.
     * @param {string} cmdKey - e.g. 'next', 'push', 'clear'
     * @param {{isBroadcaster, isLeadMod, isMod, isVip}} userRoles
     * @returns {boolean}
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

        // General
        document.getElementById('set-channel').value = s.channel || '';
        document.getElementById('set-app-title').value = s.appTitle || 'ClipQ';

        // Language dropdown
        const langSelect = document.getElementById('set-language');
        langSelect.innerHTML = '';
        ClipQ.I18n.getAvailableLanguages().forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang.code;
            opt.textContent = lang.name;
            opt.selected = lang.code === ClipQ.I18n.getLanguage();
            langSelect.appendChild(opt);
        });

        // Queue settings
        document.getElementById('set-user-clip-limit').value = s.userClipLimit || 0;
        document.getElementById('set-age-limit').value = s.ageLimitDays || 0;
        document.getElementById('set-history-retention').value = s.historyRetentionDays || 0;
        document.getElementById('set-blocked-users').value = s.blockedUsers.join('\n');
        document.getElementById('set-blocked-streamers').value = s.blockedStreamers.join('\n');

        document.querySelectorAll('.provider-chip').forEach(chip => {
            chip.classList.toggle('active', !!s.providers[chip.dataset.provider]);
        });

        // Commands
        document.getElementById('set-cmd-prefix').value = s.commands.prefix;
        for (const key of CMD_KEYS) {
            const input = document.getElementById(`set-cmd-${key}`);
            if (input) input.value = s.commands[key]?.word || DEFAULTS.commands[key].word;

            // Role badges
            const rolesContainer = document.querySelector(`.cmd-roles[data-cmd="${key}"]`);
            if (rolesContainer) {
                const roles = s.commands[key]?.roles || DEFAULT_ROLES;
                rolesContainer.querySelectorAll('.role-badge').forEach(badge => {
                    const role = badge.dataset.role;
                    badge.classList.toggle('active', !!roles[role]);
                });
            }
        }

        // History & Memory counts
        const memCount = ClipQ.Memory.count();
        const histCount = ClipQ.Queue.getHistory().length;
        document.getElementById('memory-count-text').innerHTML = t('settings.memory.count', { count: memCount });
        document.getElementById('history-count-text').innerHTML = t('settings.history.count', { count: histCount });

        // Design
        const badgesSwitch = document.getElementById('design-show-badges');
        if (badgesSwitch) {
            badgesSwitch.classList.toggle('active', s.design.showBadges !== false);
        }

        if (ClipQ.Design) ClipQ.Design.populate(s.design);
        updateCommandExamples();
    }

    function readFromUI() {
        const providers = {};
        document.querySelectorAll('.provider-chip').forEach(chip => {
            providers[chip.dataset.provider] = chip.classList.contains('active');
        });

        // Read commands with roles
        const commands = {
            prefix: document.getElementById('set-cmd-prefix').value.trim(),
        };
        for (const key of CMD_KEYS) {
            const input = document.getElementById(`set-cmd-${key}`);
            const roles = {};
            const rolesContainer = document.querySelector(`.cmd-roles[data-cmd="${key}"]`);
            if (rolesContainer) {
                rolesContainer.querySelectorAll('.role-badge').forEach(badge => {
                    roles[badge.dataset.role] = badge.classList.contains('active');
                });
            }
            commands[key] = {
                word: input ? input.value.trim() : DEFAULTS.commands[key].word,
                roles: { ...DEFAULT_ROLES, ...roles }
            };
        }

        return {
            channel: document.getElementById('set-channel').value.trim(),
            appTitle: document.getElementById('set-app-title').value.trim() || 'ClipQ',
            providers,
            userClipLimit: parseInt(document.getElementById('set-user-clip-limit').value) || 0,
            ageLimitDays: parseInt(document.getElementById('set-age-limit').value) || 0,
            historyRetentionDays: parseInt(document.getElementById('set-history-retention').value) || 0,
            blockedUsers: document.getElementById('set-blocked-users').value.split('\n').map(u => u.trim()).filter(Boolean),
            blockedStreamers: document.getElementById('set-blocked-streamers').value.split('\n').map(u => u.trim()).filter(Boolean),
            commands,
            design: (() => {
                const designVals = ClipQ.Design ? ClipQ.Design.readValues() : { colors: {}, fontFamily: 'Inter' };
                const badgesSwitch = document.getElementById('design-show-badges');
                designVals.showBadges = badgesSwitch ? badgesSwitch.classList.contains('active') : true;
                return designVals;
            })()
        };
    }

    function initUI() {
        if (ClipQ.Design) ClipQ.Design.init();

        const titleInput = document.getElementById('set-app-title');
        if (titleInput) {
            titleInput.addEventListener('input', () => {
                const titleEl = document.getElementById('app-title');
                if (titleEl) {
                    titleEl.textContent = titleInput.value.trim() || 'ClipQ';
                }
            });
        }

        const prefixInput = document.getElementById('set-cmd-prefix');
        if (prefixInput) {
            prefixInput.addEventListener('input', updateCommandExamples);
        }
        CMD_KEYS.forEach(key => {
            const input = document.getElementById(`set-cmd-${key}`);
            if (input) {
                input.addEventListener('input', updateCommandExamples);
            }
        });

        const badgesSwitch = document.getElementById('design-show-badges');
        if (badgesSwitch) {
            badgesSwitch.addEventListener('click', () => {
                badgesSwitch.classList.toggle('active');
                const currentSettings = get();
                currentSettings.design.showBadges = badgesSwitch.classList.contains('active');
                if (ClipQ.App.renderQueueList) ClipQ.App.renderQueueList();
            });
        }

        // Settings tabs
        document.querySelectorAll('.modal-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.modal-tabs .tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('stab-' + tab.dataset.stab).classList.add('active');
            });
        });

        // Provider chips
        document.querySelectorAll('.provider-chip').forEach(chip => {
            chip.addEventListener('click', () => chip.classList.toggle('active'));
        });

        // Role badge toggles
        document.querySelectorAll('.role-badge').forEach(badge => {
            badge.addEventListener('click', () => badge.classList.toggle('active'));
        });

        // Memory purge
        document.getElementById('purge-memory-btn').addEventListener('click', () => {
            if (confirm(ClipQ.I18n.t('settings.memory.confirm_purge'))) {
                ClipQ.Memory.purge();
                document.getElementById('memory-count-text').innerHTML =
                    ClipQ.I18n.t('settings.memory.count', { count: 0 });
            }
        });

        // History purge
        document.getElementById('purge-history-btn').addEventListener('click', () => {
            if (confirm(ClipQ.I18n.t('settings.history.confirm_purge'))) {
                ClipQ.Queue.clearHistory();
                document.getElementById('history-count-text').innerHTML =
                    ClipQ.I18n.t('settings.history.count', { count: 0 });
            }
        });

        document.getElementById('settings-close').addEventListener('click', closeModal);
        document.getElementById('settings-cancel').addEventListener('click', closeModal);

        document.getElementById('settings-save').addEventListener('click', () => {
            const newSettings = readFromUI();
            const oldChannel = get().channel;
            save(newSettings);

            // Apply language change
            const selectedLang = document.getElementById('set-language').value;
            if (selectedLang !== ClipQ.I18n.getLanguage()) {
                ClipQ.I18n.setLanguage(selectedLang);
            }

            // Apply app title
            const titleEl = document.getElementById('app-title');
            if (titleEl) titleEl.textContent = newSettings.appTitle || 'ClipQ';

            closeModal(true);

            // Run history cleanup with new retention setting
            ClipQ.Queue.cleanupHistory();

            if (newSettings.channel !== oldChannel && ClipQ.Chat) {
                ClipQ.Chat.reconnect(newSettings.channel);
            }
        });

        document.getElementById('settings-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('settings-overlay')) closeModal();
        });
    }

    function updateCommandExamples() {
        const prefix = document.getElementById('set-cmd-prefix').value.trim();
        const exampleLabel = ClipQ.I18n.t('settings.commands.example_label') || 'Ex:';
        const suffixes = {
            next: '',
            push: ' https://clips.twitch.tv/...',
            open: '',
            close: '',
            clear: '',
            purgememory: '',
            autoplay: ' off',
            limit: ' 5',
            remove: ' all',
            providers: ' twitch off'
        };

        for (const key of CMD_KEYS) {
            const input = document.getElementById(`set-cmd-${key}`);
            const exampleEl = document.getElementById(`example-cmd-${key}`);
            if (input && exampleEl) {
                const cmdWord = input ? input.value.trim() : '';
                if (cmdWord) {
                    exampleEl.textContent = `${exampleLabel} ${prefix} ${cmdWord}${suffixes[key]}`;
                } else {
                    exampleEl.textContent = '';
                }
            }
        }
    }

    function closeModal(keepDesign) {
        if (ClipQ.Design) ClipQ.Design.closePicker();
        if (!keepDesign) {
            if (ClipQ.Design) ClipQ.Design.revertToOriginal();
            const s = load();
            const titleEl = document.getElementById('app-title');
            if (titleEl) titleEl.textContent = s.appTitle || 'ClipQ';
            if (ClipQ.App.renderQueueList) ClipQ.App.renderQueueList();
        }
        document.getElementById('settings-overlay').classList.add('hidden');
    }

    return { load, save, get, isUserBlocked, isStreamerBlocked, hasCommandPermission, initUI, populateUI, CMD_KEYS };
})();
