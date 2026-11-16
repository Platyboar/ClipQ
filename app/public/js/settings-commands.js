/**
 * settings-commands.js - Command configuration defaults, migration, and Settings UI bindings
 */
window.ClipQ = window.ClipQ || {};

ClipQ.SettingsCommands = (() => {
    'use strict';

    const DEFAULT_PREFIX = '!clipq';
    const DEFAULT_ROLES = { broadcaster: true, leadMod: true, mod: true, vip: false, all: false };
    const CMD_KEYS = ['next', 'push', 'open', 'close', 'clear', 'purgememory', 'autoplay', 'limit', 'remove', 'providers'];
    const DEFAULT_COMMAND_WORDS = {
        next: 'next',
        push: 'push',
        open: 'open',
        close: 'close',
        clear: 'clear',
        purgememory: 'purgememory',
        autoplay: 'autoplay',
        limit: 'limit',
        remove: 'remove',
        providers: 'providers'
    };

    const EXAMPLE_SUFFIXES = {
        next: '',
        push: ' https://clips.twitch.tv/...',
        open: '',
        close: '',
        clear: '',
        purgememory: '',
        autoplay: ' off',
        limit: ' 5',
        remove: ' <URL | all | user>',
        providers: ' twitch off'
    };

    function cloneCommand(word, roles = DEFAULT_ROLES) {
        return { word, roles: { ...roles } };
    }

    function cloneDefaults() {
        const cloned = { prefix: DEFAULT_PREFIX };
        for (const key of CMD_KEYS) {
            cloned[key] = cloneCommand(DEFAULT_COMMAND_WORDS[key]);
        }
        return cloned;
    }

    /**
     * Migrate legacy flat-string or renamed command configs to object format.
     */
    function migrate(savedCmds) {
        const defaults = cloneDefaults();
        if (!savedCmds) return defaults;

        const migrated = { prefix: savedCmds.prefix ?? defaults.prefix };

        for (const key of CMD_KEYS) {
            if (savedCmds[key] && typeof savedCmds[key] === 'object' && typeof savedCmds[key].word === 'string') {
                migrated[key] = {
                    word: savedCmds[key].word,
                    roles: { ...DEFAULT_ROLES, ...(savedCmds[key].roles || {}) }
                };
            } else if (typeof savedCmds[key] === 'string') {
                migrated[key] = cloneCommand(savedCmds[key]);
            } else {
                migrated[key] = defaults[key];
            }
        }

        // Legacy rename: 'skip' -> 'next'
        if (savedCmds.skip && !savedCmds.next) {
            const skipWord = typeof savedCmds.skip === 'string' ? savedCmds.skip : (savedCmds.skip.word || 'next');
            const skipRoles = typeof savedCmds.skip === 'object' && savedCmds.skip.roles
                ? { ...DEFAULT_ROLES, ...savedCmds.skip.roles }
                : { ...DEFAULT_ROLES };
            migrated.next = { word: skipWord === 'skip' ? 'next' : skipWord, roles: skipRoles };
        }

        return migrated;
    }

    function renderList() {
        const container = document.getElementById('commands-list');
        if (!container) return;

        const t = ClipQ.I18n.t.bind(ClipQ.I18n);
        const roleMeta = [
            { role: 'broadcaster', i18nKey: 'roles.broadcaster', img: ClipQ.ROLE_BADGES.broadcaster },
            { role: 'leadMod', i18nKey: 'roles.lead_mod', img: ClipQ.ROLE_BADGES.leadMod },
            { role: 'mod', i18nKey: 'roles.mod', img: ClipQ.ROLE_BADGES.mod },
            { role: 'vip', i18nKey: 'roles.vip', img: ClipQ.ROLE_BADGES.vip }
        ];

        container.innerHTML = CMD_KEYS.map(key => {
            const label = ClipQ.escapeHtml(t(`settings.commands.${key}`));
            const defaultWord = ClipQ.escapeHtml(DEFAULT_COMMAND_WORDS[key]);
            const badgesHtml = roleMeta.map(r => {
                const roleLabel = ClipQ.escapeHtml(t(r.i18nKey));
                const isActive = !!DEFAULT_ROLES[r.role];
                const safeImg = ClipQ.sanitizeUrl(r.img);
                return `<button type="button" class="role-badge${isActive ? ' active' : ''}" data-role="${r.role}" data-i18n-title="${r.i18nKey}" title="${roleLabel}" aria-pressed="${isActive}">${safeImg ? `<img src="${ClipQ.escapeHtml(safeImg)}" alt="${roleLabel}">` : ''}</button>`;
            }).join('');

            return `
                <div class="cmd-row form-group" data-cmd="${key}">
                    <label class="form-label" for="set-cmd-${key}" data-i18n="settings.commands.${key}">${label}</label>
                    <div class="cmd-row-inner">
                        <input type="text" class="form-input cmd-word" id="set-cmd-${key}" value="${defaultWord}">
                        <div class="cmd-roles" data-cmd="${key}">
                            ${badgesHtml}
                            <button type="button" class="role-badge role-all" data-role="all" aria-pressed="false"><span data-i18n="settings.commands.role_all">${ClipQ.escapeHtml(t('settings.commands.role_all'))}</span></button>
                        </div>
                    </div>
                    <div class="cmd-example" id="example-cmd-${key}"></div>
                </div>
            `;
        }).join('');
    }

    function updateExamples() {
        const prefixEl = document.getElementById('set-cmd-prefix');
        const prefix = prefixEl ? prefixEl.value.trim() : '';
        const exampleLabel = ClipQ.I18n.t('settings.commands.example_label') || 'Ex:';

        for (const key of CMD_KEYS) {
            const input = document.getElementById(`set-cmd-${key}`);
            const exampleEl = document.getElementById(`example-cmd-${key}`);
            if (!input || !exampleEl) continue;

            const cmdWord = input.value.trim();
            exampleEl.textContent = cmdWord ? `${exampleLabel} ${prefix} ${cmdWord}${EXAMPLE_SUFFIXES[key]}` : '';
        }
    }

    function populateUI(commands) {
        const prefixEl = document.getElementById('set-cmd-prefix');
        if (prefixEl) prefixEl.value = commands.prefix;

        for (const key of CMD_KEYS) {
            const input = document.getElementById(`set-cmd-${key}`);
            if (input) input.value = commands[key]?.word ?? DEFAULT_COMMAND_WORDS[key];

            const rolesContainer = document.querySelector(`.cmd-roles[data-cmd="${key}"]`);
            if (rolesContainer) {
                const roles = commands[key]?.roles || DEFAULT_ROLES;
                rolesContainer.querySelectorAll('.role-badge').forEach(badge => {
                    const active = !!roles[badge.dataset.role];
                    badge.classList.toggle('active', active);
                    badge.setAttribute('aria-pressed', String(active));
                });
            }
        }
        updateExamples();
    }

    function readFromUI() {
        const prefixEl = document.getElementById('set-cmd-prefix');
        const commands = { prefix: prefixEl ? prefixEl.value.trim() : DEFAULT_PREFIX };

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
                word: input ? input.value.trim() : DEFAULT_COMMAND_WORDS[key],
                roles: { ...DEFAULT_ROLES, ...roles }
            };
        }
        return commands;
    }

    function initListeners() {
        const prefixInput = document.getElementById('set-cmd-prefix');
        if (prefixInput) prefixInput.addEventListener('input', updateExamples);

        CMD_KEYS.forEach(key => {
            const input = document.getElementById(`set-cmd-${key}`);
            if (input) input.addEventListener('input', updateExamples);
        });
    }

    return {
        cloneDefaults,
        migrate,
        renderList,
        populateUI,
        readFromUI,
        initListeners
    };
})();
