/**
 * settings.js — Settings persistence and UI logic
 * Supports i18n, command permissions per role, app title, and language selection.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Settings = (() => {
    const STORAGE_KEY = 'clipq_settings';

    const DEFAULT_ROLES = { broadcaster: true, leadMod: true, mod: true, vip: false, all: false };

    let currentLayoutOrder = ['chat_ad', 'facecam', 'queue'];
    let currentHeightPercent = { facecam: 40, queue: 35, chat_ad: 25 };

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
        memory: {
            bypassRoles: { leadMod: true, mod: false }
        },
        design: { colors: {}, fontFamily: 'Inter', showBadges: true },
        layout: {
            infoPosition: 'below',
            sidebarPosition: 'right',
            showFacecam: true,
            showChat: true,
            showAd: true,
            showQueue: true,
            playerWidth: 70,
            chatWidth: 60,
            facecamHeightPercent: 40,
            chatAdHeightPercent: 25,
            queueHeightPercent: 35,
            lockFacecam: false,
            lockChatAd: false,
            lockQueue: false,
            order: ['chat_ad', 'facecam', 'queue']
        }
    };

    /** All command keys (excluding 'prefix') */
    const CMD_KEYS = ['next', 'push', 'open', 'close', 'clear', 'purgememory', 'autoplay', 'limit', 'remove', 'providers'];

    /** Layout toggle element IDs */
    const LAYOUT_TOGGLES = ['facecam', 'chat', 'ad', 'queue'];

    /** Read the active state of a toggle-switch element, defaulting to true */
    function getToggleState(id) {
        const el = document.getElementById(id);
        return el ? el.classList.contains('active') : true;
    }

    /** Set the active state of a toggle-switch element */
    function setToggleState(id, active) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', active);
    }

    /** Read all layout-related elements into a config object */
    function readLayoutFromUI() {
        const infoPosEl = document.getElementById('layout-info-position');
        const sidebarPosEl = document.getElementById('layout-sidebar-position');
        const playerWidthEl = document.getElementById('layout-player-width');
        const chatWidthEl = document.getElementById('layout-chat-width');
        const fcHeightEl = document.getElementById('layout-facecam-height');
        const qHeightEl = document.getElementById('layout-queue-height');
        const lockFcEl = document.getElementById('layout-lock-facecam');
        const lockCaEl = document.getElementById('layout-lock-chat-ad');
        const lockQEl = document.getElementById('layout-lock-queue');

        // We also need the chatAdHeightPercent value. 
        // In the UI we only have sliders for facecam and queue. Chat/Ad is computed dynamically.
        // But to make sure it's saved correctly, we read the current slider values and compute chatAdHeightPercent
        // as 100 - facecam - queue, or we can just read the value from our current state/cache if we want.
        // Wait, it is best to read the sliders, and let the Chat/Ad height be 100 - facecam - queue.
        // Let's compute:
        const fcVal = fcHeightEl ? (parseInt(fcHeightEl.value) || 40) : 40;
        const qVal = qHeightEl ? (parseInt(qHeightEl.value) || 35) : 35;
        const caVal = 100 - fcVal - qVal;

        return {
            infoPosition: infoPosEl ? infoPosEl.value : 'below',
            sidebarPosition: sidebarPosEl ? sidebarPosEl.value : 'right',
            playerWidth: playerWidthEl ? (parseInt(playerWidthEl.value) || 70) : 70,
            chatWidth: chatWidthEl ? (parseInt(chatWidthEl.value) || 60) : 60,
            facecamHeightPercent: fcVal,
            chatAdHeightPercent: caVal,
            queueHeightPercent: qVal,
            lockFacecam: lockFcEl ? lockFcEl.checked : false,
            lockChatAd: lockCaEl ? lockCaEl.checked : false,
            lockQueue: lockQEl ? lockQEl.checked : false,
            showFacecam: getToggleState('layout-show-facecam'),
            showChat: getToggleState('layout-show-chat'),
            showAd: getToggleState('layout-show-ad'),
            showQueue: getToggleState('layout-show-queue'),
            order: currentLayoutOrder
        };
    }

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
                memory: {
                    ...DEFAULTS.memory,
                    ...(saved?.memory || {})
                },
                design: {
                    ...DEFAULTS.design,
                    ...(saved?.design || {}),
                    colors: { ...(saved?.design?.colors || {}) }
                },
                layout: {
                    ...DEFAULTS.layout,
                    ...(saved?.layout || {})
                }
            };
        } catch {
            current = { ...DEFAULTS, commands: { ...DEFAULTS.commands } };
        }
        // Apply saved design and layout on load
        if (current.design && ClipQ.Design) ClipQ.Design.applyAll(current.design);
        if (current.layout && window.ClipQ && window.ClipQ.Layout) window.ClipQ.Layout.apply(current.layout);
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
        const channelText = document.getElementById('set-channel-text');
        if (channelText) channelText.textContent = s.channel || '';
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
        
        // Memory bypass roles
        const memoryRolesContainer = document.getElementById('memory-bypass-roles');
        if (memoryRolesContainer) {
            const bypassRoles = s.memory?.bypassRoles || DEFAULTS.memory.bypassRoles;
            memoryRolesContainer.querySelectorAll('.role-badge').forEach(badge => {
                const role = badge.dataset.role;
                badge.classList.toggle('active', !!bypassRoles[role]);
            });
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

        // Layout
        if (s.layout) {
            applyLayoutToUI(s.layout);
        }

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
            channel: get().channel,
            appTitle: document.getElementById('set-app-title').value.trim() || 'ClipQ',
            providers,
            userClipLimit: parseInt(document.getElementById('set-user-clip-limit').value) || 0,
            ageLimitDays: parseInt(document.getElementById('set-age-limit').value) || 0,
            historyRetentionDays: parseInt(document.getElementById('set-history-retention').value) || 0,
            blockedUsers: document.getElementById('set-blocked-users').value.split('\n').map(u => u.trim()).filter(Boolean),
            blockedStreamers: document.getElementById('set-blocked-streamers').value.split('\n').map(u => u.trim()).filter(Boolean),
            commands,
            memory: (() => {
                const bypassRoles = {};
                const memoryRolesContainer = document.getElementById('memory-bypass-roles');
                if (memoryRolesContainer) {
                    memoryRolesContainer.querySelectorAll('.role-badge').forEach(badge => {
                        bypassRoles[badge.dataset.role] = badge.classList.contains('active');
                    });
                }
                return { bypassRoles };
            })(),
            design: (() => {
                const designVals = ClipQ.Design ? ClipQ.Design.readValues() : { colors: {}, fontFamily: 'Inter' };
                const badgesSwitch = document.getElementById('design-show-badges');
                designVals.showBadges = badgesSwitch ? badgesSwitch.classList.contains('active') : true;
                return designVals;
            })(),
            layout: readLayoutFromUI()
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

        // Layout listeners
        const infoPosSelect = document.getElementById('layout-info-position');
        if (infoPosSelect) {
            infoPosSelect.addEventListener('change', triggerLiveLayoutApply);
        }

        const sidebarPosSelect = document.getElementById('layout-sidebar-position');
        if (sidebarPosSelect) {
            sidebarPosSelect.addEventListener('change', triggerLiveLayoutApply);
        }

        const playerWidthInput = document.getElementById('layout-player-width');
        if (playerWidthInput) {
            playerWidthInput.addEventListener('input', () => {
                const widthValEl = document.getElementById('layout-player-width-val');
                if (widthValEl) widthValEl.textContent = `${playerWidthInput.value}%`;
                triggerLiveLayoutApply();
            });
        }

        const chatWidthInput = document.getElementById('layout-chat-width');
        if (chatWidthInput) {
            chatWidthInput.addEventListener('input', () => {
                const widthValEl = document.getElementById('layout-chat-width-val');
                if (widthValEl) widthValEl.textContent = `${chatWidthInput.value}%`;
                triggerLiveLayoutApply();
            });
        }

        const layoutToggles = ['facecam', 'chat', 'ad', 'queue'];
        layoutToggles.forEach(type => {
            const toggle = document.getElementById(`layout-show-${type}`);
            if (toggle) {
                toggle.addEventListener('click', () => {
                    toggle.classList.toggle('active');
                    renderOrderingUI();
                    triggerLiveLayoutApply();
                });
            }
        });

        const facecamHeightInput = document.getElementById('layout-facecam-height');
        if (facecamHeightInput) {
            facecamHeightInput.addEventListener('input', () => {
                distributeChange('facecam', parseInt(facecamHeightInput.value));
            });
        }

        const queueHeightInput = document.getElementById('layout-queue-height');
        if (queueHeightInput) {
            queueHeightInput.addEventListener('input', () => {
                distributeChange('queue', parseInt(queueHeightInput.value));
            });
        }

        ['lock-facecam', 'lock-chat-ad', 'lock-queue'].forEach(id => {
            const el = document.getElementById(`layout-${id}`);
            if (el) {
                el.addEventListener('change', () => {
                    if (id === 'lock-facecam') {
                        const slider = document.getElementById('layout-facecam-height');
                        if (slider) slider.disabled = el.checked;
                    } else if (id === 'lock-queue') {
                        const slider = document.getElementById('layout-queue-height');
                        if (slider) slider.disabled = el.checked;
                    }
                    triggerLiveLayoutApply();
                });
            }
        });

        const layoutSetDefaultBtn = document.getElementById('layout-set-default-btn');
        if (layoutSetDefaultBtn) {
            layoutSetDefaultBtn.addEventListener('click', () => {
                if (confirm(ClipQ.I18n.t('settings.layout.confirm_set_default'))) {
                    const currentLayout = {
                        infoPosition: document.getElementById('layout-info-position').value,
                        sidebarPosition: document.getElementById('layout-sidebar-position').value,
                        playerWidth: parseInt(document.getElementById('layout-player-width').value) || 70,
                        chatWidth: parseInt(document.getElementById('layout-chat-width').value) || 60,
                        facecamHeightPercent: parseInt(document.getElementById('layout-facecam-height').value) || 40,
                        chatAdHeightPercent: 100 - (parseInt(document.getElementById('layout-facecam-height').value) || 40) - (parseInt(document.getElementById('layout-queue-height').value) || 35),
                        queueHeightPercent: parseInt(document.getElementById('layout-queue-height').value) || 35,
                        lockFacecam: document.getElementById('layout-lock-facecam').checked,
                        lockChatAd: document.getElementById('layout-lock-chat-ad').checked,
                        lockQueue: document.getElementById('layout-lock-queue').checked,
                        showFacecam: document.getElementById('layout-show-facecam').classList.contains('active'),
                        showChat: document.getElementById('layout-show-chat').classList.contains('active'),
                        showAd: document.getElementById('layout-show-ad').classList.contains('active'),
                        showQueue: document.getElementById('layout-show-queue').classList.contains('active'),
                        order: currentLayoutOrder
                    };
                    localStorage.setItem('clipq_layout_custom_defaults', JSON.stringify(currentLayout));
                    alert(ClipQ.I18n.t('settings.layout.alert_set_default'));
                }
            });
        }

        const layoutResetBtn = document.getElementById('layout-reset-btn');
        if (layoutResetBtn) {
            layoutResetBtn.addEventListener('click', () => {
                const hasCustom = !!localStorage.getItem('clipq_layout_custom_defaults');
                let targetLayout = null;

                if (hasCustom) {
                    const choice = confirm(ClipQ.I18n.t('settings.layout.confirm_reset_custom'));
                    if (choice) {
                        targetLayout = JSON.parse(localStorage.getItem('clipq_layout_custom_defaults'));
                    } else {
                        if (confirm(ClipQ.I18n.t('settings.layout.confirm_reset_factory'))) {
                            localStorage.removeItem('clipq_layout_custom_defaults');
                            targetLayout = DEFAULTS.layout;
                        }
                    }
                } else {
                    if (confirm(ClipQ.I18n.t('settings.layout.confirm_reset_all'))) {
                        targetLayout = DEFAULTS.layout;
                    }
                }

                if (targetLayout) {
                    applyLayoutToUI(targetLayout);
                    triggerLiveLayoutApply();
                }
            });
        }

        const settingsLogoutBtn = document.getElementById('settings-logout');
        if (settingsLogoutBtn) {
            settingsLogoutBtn.addEventListener('click', () => {
                ClipQ.Auth.logout();
            });
        }

        document.getElementById('settings-close').addEventListener('click', closeModal);
        document.getElementById('settings-cancel').addEventListener('click', closeModal);

        document.getElementById('settings-save').addEventListener('click', () => {
            applyAndSave();
        });

        document.getElementById('settings-save-close').addEventListener('click', () => {
            applyAndSave();
            closeModal(true);
        });

        const settingsResetBtn = document.getElementById('settings-reset');
        if (settingsResetBtn) {
            settingsResetBtn.addEventListener('click', () => {
                if (confirm(ClipQ.I18n.t('settings.general.confirm_reset'))) {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem('clipq_custom_defaults');
                    localStorage.removeItem('clipq_layout_custom_defaults');
                    localStorage.removeItem('clipq_autoplay');
                    window.location.reload();
                }
            });
        }
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

    /**
     * Apply all current settings from the UI without closing the modal.
     * Used by both 'Save' and 'Save + Close' buttons.
     */
    function applyAndSave() {
        const newSettings = readFromUI();
        const oldChannel = get().channel;
        save(newSettings);

        // Apply language change
        const selectedLang = document.getElementById('set-language').value;
        if (selectedLang !== ClipQ.I18n.getLanguage()) {
            ClipQ.I18n.setLanguage(selectedLang);
            if (ClipQ.Design && ClipQ.Design.renderSwatches) {
                ClipQ.Design.renderSwatches();
            }
        }

        // Apply app title
        const titleEl = document.getElementById('app-title');
        if (titleEl) titleEl.textContent = newSettings.appTitle || 'ClipQ';

        // Apply layout changes
        if (newSettings.layout && window.ClipQ && window.ClipQ.Layout) {
            window.ClipQ.Layout.apply(newSettings.layout);
        }

        // Run history cleanup with new retention setting
        ClipQ.Queue.cleanupHistory();

        if (newSettings.channel !== oldChannel && ClipQ.Chat) {
            ClipQ.Chat.reconnect(newSettings.channel);
        }

        populateUI();
    }

    function closeModal(keepDesign) {
        if (ClipQ.Design) ClipQ.Design.closePicker();
        if (!keepDesign) {
            if (ClipQ.Design) ClipQ.Design.revertToOriginal();
            const s = load();
            const titleEl = document.getElementById('app-title');
            if (titleEl) titleEl.textContent = s.appTitle || 'ClipQ';
            if (ClipQ.App.renderQueueList) ClipQ.App.renderQueueList();
            if (s.layout && window.ClipQ && window.ClipQ.Layout) {
                window.ClipQ.Layout.apply(s.layout);
            }
        }
        document.getElementById('settings-overlay').classList.add('hidden');
    }

    function triggerLiveLayoutApply() {
        const config = readLayoutFromUI();
        if (window.ClipQ && window.ClipQ.Layout) {
            window.ClipQ.Layout.apply(config);
        }
    }

    /**
     * Apply a layout config object to the settings UI controls.
     * Used by populateUI and layout reset to avoid code duplication.
     */
    function applyLayoutToUI(layout) {
        currentHeightPercent.facecam = layout.facecamHeightPercent || 40;
        currentHeightPercent.queue = layout.queueHeightPercent || 35;
        currentHeightPercent.chat_ad = layout.chatAdHeightPercent || (100 - currentHeightPercent.facecam - currentHeightPercent.queue);

        document.getElementById('layout-info-position').value = layout.infoPosition || 'below';
        document.getElementById('layout-sidebar-position').value = layout.sidebarPosition || 'right';

        const playerWidth = layout.playerWidth || 70;
        document.getElementById('layout-player-width').value = playerWidth;
        const widthValEl = document.getElementById('layout-player-width-val');
        if (widthValEl) widthValEl.textContent = `${playerWidth}%`;

        const chatWidth = layout.chatWidth || 60;
        const chatWidthInput = document.getElementById('layout-chat-width');
        if (chatWidthInput) chatWidthInput.value = chatWidth;
        const chatWidthValEl = document.getElementById('layout-chat-width-val');
        if (chatWidthValEl) chatWidthValEl.textContent = `${chatWidth}%`;

        const fcHeight = layout.facecamHeightPercent || 40;
        const fcHeightInput = document.getElementById('layout-facecam-height');
        if (fcHeightInput) fcHeightInput.value = fcHeight;
        const fcHeightValEl = document.getElementById('layout-facecam-height-val');
        if (fcHeightValEl) fcHeightValEl.textContent = `${fcHeight}%`;

        const qHeight = layout.queueHeightPercent || 35;
        const qHeightInput = document.getElementById('layout-queue-height');
        if (qHeightInput) qHeightInput.value = qHeight;
        const qHeightValEl = document.getElementById('layout-queue-height-val');
        if (qHeightValEl) qHeightValEl.textContent = `${qHeight}%`;

        const lockFcEl = document.getElementById('layout-lock-facecam');
        if (lockFcEl) {
            lockFcEl.checked = !!layout.lockFacecam;
            const slider = document.getElementById('layout-facecam-height');
            if (slider) slider.disabled = lockFcEl.checked;
        }
        const lockCaEl = document.getElementById('layout-lock-chat-ad');
        if (lockCaEl) lockCaEl.checked = !!layout.lockChatAd;
        const lockQEl = document.getElementById('layout-lock-queue');
        if (lockQEl) {
            lockQEl.checked = !!layout.lockQueue;
            const slider = document.getElementById('layout-queue-height');
            if (slider) slider.disabled = lockQEl.checked;
        }

        setToggleState('layout-show-facecam', layout.showFacecam !== false);
        setToggleState('layout-show-chat', layout.showChat !== false);
        setToggleState('layout-show-ad', layout.showAd !== false);
        setToggleState('layout-show-queue', layout.showQueue !== false);

        currentLayoutOrder = layout.order ? [...layout.order] : ['chat_ad', 'facecam', 'queue'];
        renderOrderingUI();
    }

    function renderOrderingUI() {
        const listContainer = document.getElementById('layout-ordering-list');
        if (!listContainer) return;

        const t = ClipQ.I18n.t.bind(ClipQ.I18n);

        const facecamToggle = document.getElementById('layout-show-facecam');
        const chatToggle = document.getElementById('layout-show-chat');
        const adToggle = document.getElementById('layout-show-ad');
        const queueToggle = document.getElementById('layout-show-queue');

        const showFacecam = facecamToggle ? facecamToggle.classList.contains('active') : true;
        const showChat = chatToggle ? chatToggle.classList.contains('active') : true;
        const showAd = adToggle ? adToggle.classList.contains('active') : true;
        const showQueue = queueToggle ? queueToggle.classList.contains('active') : true;
        const showChatAd = showChat || showAd;

        // Filter currently active components in current layout order
        const activeComponents = currentLayoutOrder.filter(item => {
            if (item === 'facecam') return showFacecam;
            if (item === 'chat_ad') return showChatAd;
            if (item === 'queue') return showQueue;
            return false;
        });

        // If 1 or fewer components are active, hide the entire group
        const orderingGroup = document.getElementById('layout-ordering-group');
        if (activeComponents.length <= 1) {
            if (orderingGroup) orderingGroup.style.display = 'none';
            listContainer.innerHTML = '';
            return;
        } else {
            if (orderingGroup) orderingGroup.style.display = '';
        }

        listContainer.innerHTML = '';

        const labels = {
            facecam: t('settings.layout.block_facecam') || 'Facecam',
            chat_ad: t('settings.layout.block_chat_ad') || 'Chat + Ad',
            queue: t('settings.layout.block_queue') || 'Queue'
        };

        const positions = [
            { label: t('settings.layout.pos_top') || 'Top', index: 0 },
            { label: t('settings.layout.pos_middle') || 'Middle', index: 1 },
            { label: t('settings.layout.pos_bottom') || 'Bottom', index: 2 }
        ];

        // If only 2 components are active, only show Top and Bottom
        const allowedPositions = activeComponents.length === 3 
            ? positions 
            : [positions[0], positions[2]];

        activeComponents.forEach((comp, idx) => {
            const row = document.createElement('div');
            row.className = 'layout-order-row';
            row.style.display = 'flex';
            row.style.justify = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '8px 12px';
            row.style.background = 'rgba(255,255,255,0.03)';
            row.style.border = '1px solid var(--color-border)';
            row.style.borderRadius = 'var(--border-radius-sm)';

            const labelSpan = document.createElement('span');
            labelSpan.textContent = labels[comp];
            labelSpan.style.fontWeight = '600';
            labelSpan.style.flex = '1';
            row.appendChild(labelSpan);

            const btnGroup = document.createElement('div');
            btnGroup.className = 'layout-order-buttons';
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '4px';

            allowedPositions.forEach((pos, posIdx) => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.style.padding = '4px 10px';
                btn.style.fontSize = 'var(--font-size-sm)';
                btn.style.borderRadius = '4px';
                btn.textContent = pos.label;

                const isActive = idx === posIdx;

                if (isActive) {
                    btn.className += ' btn-primary';
                } else {
                    btn.className += ' btn-ghost';
                }

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (isActive) return;

                    const item = activeComponents.splice(idx, 1)[0];
                    activeComponents.splice(posIdx, 0, item);

                    const inactive = ['facecam', 'chat_ad', 'queue'].filter(c => !activeComponents.includes(c));
                    currentLayoutOrder = [...activeComponents, ...inactive];

                    renderOrderingUI();
                    triggerLiveLayoutApply();
                });

                btnGroup.appendChild(btn);
            });

            row.appendChild(btnGroup);
            listContainer.appendChild(row);
        });
    }

    function distributeChange(changedKey, newValue) {
        const oldFcVal = currentHeightPercent.facecam;
        const oldQVal = currentHeightPercent.queue;
        const oldCaVal = currentHeightPercent.chat_ad;
        
        const locks = {
            facecam: document.getElementById('layout-lock-facecam')?.checked || false,
            chat_ad: document.getElementById('layout-lock-chat-ad')?.checked || false,
            queue: document.getElementById('layout-lock-queue')?.checked || false
        };
        const active = {
            facecam: getToggleState('layout-show-facecam'),
            chat_ad: getToggleState('layout-show-chat') || getToggleState('layout-show-ad'),
            queue: getToggleState('layout-show-queue')
        };

        const currentValues = {
            facecam: oldFcVal,
            chat_ad: oldCaVal,
            queue: oldQVal
        };

        const oldValue = currentValues[changedKey];
        const delta = newValue - oldValue;
        if (delta === 0) return;

        const receiverKeys = Object.keys(active).filter(k => k !== changedKey && active[k] && !locks[k]);

        if (receiverKeys.length === 0) {
            updateSliderUI(changedKey, oldValue);
            return;
        }

        let remainingDelta = delta;
        const newValues = { ...currentValues };
        newValues[changedKey] = newValue;

        let attempts = 0;
        let pool = [...receiverKeys];
        while (Math.abs(remainingDelta) > 0.01 && pool.length > 0 && attempts < 5) {
            attempts++;
            const share = remainingDelta / pool.length;
            let nextPool = [];

            for (const rKey of pool) {
                let val = newValues[rKey] - share;
                if (val < 10) {
                    remainingDelta -= (newValues[rKey] - 10);
                    newValues[rKey] = 10;
                } else if (val > 80) {
                    remainingDelta -= (newValues[rKey] - 80);
                    newValues[rKey] = 80;
                } else {
                    newValues[rKey] = val;
                    remainingDelta -= share;
                    nextPool.push(rKey);
                }
            }
            pool = nextPool;
        }

        if (Math.abs(remainingDelta) > 0.01) {
            newValues[changedKey] -= remainingDelta;
        }

        const finalSum = newValues.facecam + newValues.chat_ad + newValues.queue;
        if (finalSum !== 100) {
            const adjustKey = receiverKeys[0] || changedKey;
            newValues[adjustKey] += (100 - finalSum);
        }

        // Cache the newly calculated heights
        currentHeightPercent.facecam = Math.round(newValues.facecam);
        currentHeightPercent.queue = Math.round(newValues.queue);
        currentHeightPercent.chat_ad = Math.round(newValues.chat_ad);

        updateSliderUI('facecam', currentHeightPercent.facecam);
        updateSliderUI('queue', currentHeightPercent.queue);

        triggerLiveLayoutApply();
    }

    function updateSliderUI(key, value) {
        const slider = document.getElementById(`layout-${key}-height`);
        if (slider) {
            slider.value = value;
            const valEl = document.getElementById(`layout-${key}-height-val`);
            if (valEl) valEl.textContent = `${value}%`;
        }
    }

    return { load, save, get, isUserBlocked, isStreamerBlocked, hasCommandPermission, initUI, populateUI, CMD_KEYS };
})();
