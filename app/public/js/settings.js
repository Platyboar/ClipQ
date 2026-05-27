/**
 * settings.js — Settings persistence and UI logic
 * Supports i18n, command permissions per role, app title, and language selection.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Settings = (() => {
    const STORAGE_KEY = 'clipq_settings';

    const DEFAULT_ROLES = { broadcaster: true, leadMod: true, mod: true, vip: false, all: false };

    let currentLayoutOrder = ['chat_ad', 'facecam', 'queue'];

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
        design: { colors: {}, fontFamily: 'Inter', showBadges: true },
        layout: {
            infoPosition: 'below',
            sidebarPosition: 'right',
            showFacecam: true,
            showChat: true,
            showAd: true,
            showQueue: true,
            playerWidth: 70,
            order: ['chat_ad', 'facecam', 'queue']
        }
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

        // Layout
        if (s.layout) {
            document.getElementById('layout-info-position').value = s.layout.infoPosition || 'below';
            document.getElementById('layout-sidebar-position').value = s.layout.sidebarPosition || 'right';
            
            const playerWidth = s.layout.playerWidth || 70;
            document.getElementById('layout-player-width').value = playerWidth;
            const widthValEl = document.getElementById('layout-player-width-val');
            if (widthValEl) widthValEl.textContent = `${playerWidth}%`;

            const facecamToggle = document.getElementById('layout-show-facecam');
            if (facecamToggle) facecamToggle.classList.toggle('active', s.layout.showFacecam !== false);

            const chatToggle = document.getElementById('layout-show-chat');
            if (chatToggle) chatToggle.classList.toggle('active', s.layout.showChat !== false);

            const adToggle = document.getElementById('layout-show-ad');
            if (adToggle) adToggle.classList.toggle('active', s.layout.showAd !== false);

            const queueToggle = document.getElementById('layout-show-queue');
            if (queueToggle) queueToggle.classList.toggle('active', s.layout.showQueue !== false);

            currentLayoutOrder = s.layout.order ? [...s.layout.order] : ['chat_ad', 'facecam', 'queue'];
            renderOrderingUI();
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
            })(),
            layout: {
                infoPosition: document.getElementById('layout-info-position') ? document.getElementById('layout-info-position').value : 'below',
                sidebarPosition: document.getElementById('layout-sidebar-position') ? document.getElementById('layout-sidebar-position').value : 'right',
                playerWidth: document.getElementById('layout-player-width') ? (parseInt(document.getElementById('layout-player-width').value) || 70) : 70,
                showFacecam: document.getElementById('layout-show-facecam') ? document.getElementById('layout-show-facecam').classList.contains('active') : true,
                showChat: document.getElementById('layout-show-chat') ? document.getElementById('layout-show-chat').classList.contains('active') : true,
                showAd: document.getElementById('layout-show-ad') ? document.getElementById('layout-show-ad').classList.contains('active') : true,
                showQueue: document.getElementById('layout-show-queue') ? document.getElementById('layout-show-queue').classList.contains('active') : true,
                order: currentLayoutOrder
            }
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

        const layoutSetDefaultBtn = document.getElementById('layout-set-default-btn');
        if (layoutSetDefaultBtn) {
            layoutSetDefaultBtn.addEventListener('click', () => {
                if (confirm(ClipQ.I18n.t('settings.layout.confirm_set_default'))) {
                    const currentLayout = {
                        infoPosition: document.getElementById('layout-info-position').value,
                        sidebarPosition: document.getElementById('layout-sidebar-position').value,
                        playerWidth: parseInt(document.getElementById('layout-player-width').value) || 70,
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
                    // Update UI Controls
                    document.getElementById('layout-info-position').value = targetLayout.infoPosition || 'below';
                    document.getElementById('layout-sidebar-position').value = targetLayout.sidebarPosition || 'right';
                    
                    const playerWidth = targetLayout.playerWidth || 70;
                    document.getElementById('layout-player-width').value = playerWidth;
                    const widthValEl = document.getElementById('layout-player-width-val');
                    if (widthValEl) widthValEl.textContent = `${playerWidth}%`;

                    const facecamToggle = document.getElementById('layout-show-facecam');
                    if (facecamToggle) facecamToggle.classList.toggle('active', targetLayout.showFacecam !== false);

                    const chatToggle = document.getElementById('layout-show-chat');
                    if (chatToggle) chatToggle.classList.toggle('active', targetLayout.showChat !== false);

                    const adToggle = document.getElementById('layout-show-ad');
                    if (adToggle) adToggle.classList.toggle('active', targetLayout.showAd !== false);

                    const queueToggle = document.getElementById('layout-show-queue');
                    if (queueToggle) queueToggle.classList.toggle('active', targetLayout.showQueue !== false);

                    currentLayoutOrder = targetLayout.order ? [...targetLayout.order] : ['chat_ad', 'facecam', 'queue'];
                    
                    renderOrderingUI();
                    triggerLiveLayoutApply();
                }
            });
        }

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

            // Apply layout changes
            if (newSettings.layout && window.ClipQ && window.ClipQ.Layout) {
                window.ClipQ.Layout.apply(newSettings.layout);
            }

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
            if (s.layout && window.ClipQ && window.ClipQ.Layout) {
                window.ClipQ.Layout.apply(s.layout);
            }
        }
        document.getElementById('settings-overlay').classList.add('hidden');
    }

    function triggerLiveLayoutApply() {
        const infoPosEl = document.getElementById('layout-info-position');
        const sidebarPosEl = document.getElementById('layout-sidebar-position');
        const playerWidthEl = document.getElementById('layout-player-width');
        const facecamToggle = document.getElementById('layout-show-facecam');
        const chatToggle = document.getElementById('layout-show-chat');
        const adToggle = document.getElementById('layout-show-ad');
        const queueToggle = document.getElementById('layout-show-queue');

        const config = {
            infoPosition: infoPosEl ? infoPosEl.value : 'below',
            sidebarPosition: sidebarPosEl ? sidebarPosEl.value : 'right',
            playerWidth: playerWidthEl ? (parseInt(playerWidthEl.value) || 70) : 70,
            showFacecam: facecamToggle ? facecamToggle.classList.contains('active') : true,
            showChat: chatToggle ? chatToggle.classList.contains('active') : true,
            showAd: adToggle ? adToggle.classList.contains('active') : true,
            showQueue: queueToggle ? queueToggle.classList.contains('active') : true,
            order: currentLayoutOrder
        };
        if (window.ClipQ && window.ClipQ.Layout) {
            window.ClipQ.Layout.apply(config);
        }
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

    return { load, save, get, isUserBlocked, isStreamerBlocked, hasCommandPermission, initUI, populateUI, CMD_KEYS };
})();
