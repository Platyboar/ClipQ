/**
 * settings.js — Settings persistence and UI logic
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Settings = (() => {
    const STORAGE_KEY = 'clipq_settings';

    const DEFAULTS = {
        channel: '',
        providers: { twitch: true, youtube: true, tiktok: true, kick: false, streamable: false },
        clipLimit: 0,
        ageLimitDays: 0,
        historyRetentionDays: 0, // 0 = keep forever
        blockedUsers: ['streamlabs', 'nightbot', 'streamelements', 'fossabot', 'moobot'],
        blockedStreamers: [],
        commands: { prefix: '!queue', skip: 'skip', open: 'open', close: 'close', clear: 'clear' }
    };

    let current = null;

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            current = {
                ...DEFAULTS,
                ...saved,
                providers: { ...DEFAULTS.providers, ...(saved?.providers || {}) },
                commands: { ...DEFAULTS.commands, ...(saved?.commands || {}) },
                blockedStreamers: saved?.blockedStreamers || DEFAULTS.blockedStreamers
            };
        } catch {
            current = { ...DEFAULTS };
        }
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

    function populateUI() {
        const s = get();
        document.getElementById('set-channel').value = s.channel || '';
        document.getElementById('set-clip-limit').value = s.clipLimit || 0;
        document.getElementById('set-age-limit').value = s.ageLimitDays || 0;
        document.getElementById('set-history-retention').value = s.historyRetentionDays || 0;
        document.getElementById('set-blocked-users').value = s.blockedUsers.join('\n');
        document.getElementById('set-blocked-streamers').value = s.blockedStreamers.join('\n');

        document.querySelectorAll('.provider-chip').forEach(chip => {
            chip.classList.toggle('active', !!s.providers[chip.dataset.provider]);
        });

        document.getElementById('set-cmd-prefix').value = s.commands.prefix;
        document.getElementById('set-cmd-skip').value = s.commands.skip;
        document.getElementById('set-cmd-open').value = s.commands.open;
        document.getElementById('set-cmd-close').value = s.commands.close;
        document.getElementById('set-cmd-clear').value = s.commands.clear;

        document.getElementById('memory-count').textContent = ClipQ.Memory.count();
        document.getElementById('history-count').textContent = ClipQ.Queue.getHistory().length;
    }

    function readFromUI() {
        const providers = {};
        document.querySelectorAll('.provider-chip').forEach(chip => {
            providers[chip.dataset.provider] = chip.classList.contains('active');
        });

        return {
            channel: document.getElementById('set-channel').value.trim(),
            providers,
            clipLimit: parseInt(document.getElementById('set-clip-limit').value) || 0,
            ageLimitDays: parseInt(document.getElementById('set-age-limit').value) || 0,
            historyRetentionDays: parseInt(document.getElementById('set-history-retention').value) || 0,
            blockedUsers: document.getElementById('set-blocked-users').value.split('\n').map(u => u.trim()).filter(Boolean),
            blockedStreamers: document.getElementById('set-blocked-streamers').value.split('\n').map(u => u.trim()).filter(Boolean),
            commands: {
                prefix: document.getElementById('set-cmd-prefix').value.trim(),
                skip: document.getElementById('set-cmd-skip').value.trim(),
                open: document.getElementById('set-cmd-open').value.trim(),
                close: document.getElementById('set-cmd-close').value.trim(),
                clear: document.getElementById('set-cmd-clear').value.trim()
            }
        };
    }

    function initUI() {
        document.querySelectorAll('.modal-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.modal-tabs .tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('stab-' + tab.dataset.stab).classList.add('active');
            });
        });

        document.querySelectorAll('.provider-chip').forEach(chip => {
            chip.addEventListener('click', () => chip.classList.toggle('active'));
        });

        document.getElementById('purge-memory-btn').addEventListener('click', () => {
            if (confirm('Clip Memory wirklich leeren?')) {
                ClipQ.Memory.purge();
                document.getElementById('memory-count').textContent = '0';
            }
        });

        document.getElementById('purge-history-btn').addEventListener('click', () => {
            if (confirm('History wirklich komplett löschen? (Clip Memory bleibt erhalten)')) {
                ClipQ.Queue.clearHistory();
                document.getElementById('history-count').textContent = '0';
            }
        });

        document.getElementById('settings-close').addEventListener('click', closeModal);
        document.getElementById('settings-cancel').addEventListener('click', closeModal);

        document.getElementById('settings-save').addEventListener('click', () => {
            const newSettings = readFromUI();
            const oldChannel = get().channel;
            save(newSettings);
            closeModal();

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

    function closeModal() {
        document.getElementById('settings-overlay').classList.add('hidden');
    }

    return { load, save, get, isUserBlocked, isStreamerBlocked, initUI, populateUI };
})();
