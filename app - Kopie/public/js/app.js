/**
 * app.js — Main application controller
 */
console.log('[ClipQ] app.js loaded — version 6');
window.ClipQ = window.ClipQ || {};

// Provider icon URLs (small favicons)
ClipQ.PROVIDER_ICONS = {
    twitch: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png',
    youtube: 'https://www.youtube.com/s/desktop/icon_144x144.png',
    kick: 'https://kick.com/favicon.ico',
    streamable: 'https://streamable.com/favicon.ico',
    tiktok: 'https://www.tiktok.com/favicon.ico'
};

ClipQ.App = (() => {
    let currentView = 'queue';
    let autoplay = false; // Default: OFF

    async function init() {
        const hashToken = ClipQ.Auth.parseTokenFromHash();
        const savedToken = ClipQ.Auth.getToken();
        const token = hashToken || savedToken;

        if (token) {
            const valid = await ClipQ.Auth.validate(token);
            if (valid) {
                let user = ClipQ.Auth.getUser();
                if (!user) user = await ClipQ.Auth.fetchUser(token);
                if (user) {
                    await startApp(user, token);
                    return;
                }
            }
        }

        showLogin();
    }

    function showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');

        document.getElementById('twitch-login-btn').addEventListener('click', () => {
            window.location.href = ClipQ.Auth.getLoginUrl();
        });
    }

    async function startApp(user, token) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');

        document.getElementById('user-avatar').src = user.avatar;
        document.getElementById('user-name').textContent = user.displayName;

        const settings = ClipQ.Settings.load();
        if (!settings.channel) {
            settings.channel = user.login;
            ClipQ.Settings.save(settings);
        }

        autoplay = localStorage.getItem('clipq_autoplay') === 'true';
        updateAutoplayUI();

        ClipQ.Settings.initUI();
        ClipQ.Queue.setUpdateCallback(() => { renderQueueList(); updateNextButton(); });

        setupNavigation();
        setupControls();
        setupQueueToggle();
        setupUserDropdown();
        setupAutoplay();

        console.log(`[App] Connecting to chat channel: ${settings.channel}`);
        await ClipQ.Chat.connect(settings.channel);

        ClipQ.Queue.cleanupHistory();

        renderQueueList();
        ClipQ.Player.showEmpty();
        updateNextButton();

        console.log('[App] ClipQ started successfully');
    }

    function setupNavigation() {
        document.querySelectorAll('.menu-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.menu-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentView = tab.dataset.tab;

                document.getElementById('queue-view').classList.toggle('hidden', currentView !== 'queue');
                document.getElementById('queue-view').style.display = currentView === 'queue' ? 'grid' : 'none';
                document.getElementById('history-view').classList.toggle('hidden', currentView !== 'history');

                if (currentView === 'history') renderHistory();
            });
        });
    }

    function setupControls() {
        document.getElementById('btn-next').addEventListener('click', handleNextButton);
        document.getElementById('btn-prev').addEventListener('click', () => {
            const prev = ClipQ.Queue.previousFromHistory();
            if (prev) {
                ClipQ.Player.playClip(prev);
                updateNextButton();
            }
        });
        document.getElementById('queue-clear-btn').addEventListener('click', () => {
            if (confirm('Queue wirklich leeren?')) ClipQ.Queue.clear();
        });
    }

    /** Handle "Start" vs "Nächster" button */
    function handleNextButton() {
        if (!ClipQ.Player.getCurrent()) {
            // No clip playing → "Start" mode: play first clip WITHOUT removing it
            const first = ClipQ.Queue.current();
            if (first) {
                ClipQ.Player.playClip(first);
                updateNextButton();
            }
        } else {
            // Clip is playing → "Nächster" mode: advance queue
            nextClip();
        }
    }

    function updateNextButton() {
        const btn = document.getElementById('btn-next');
        if (ClipQ.Player.getCurrent()) {
            btn.textContent = 'Nächster →';
        } else {
            btn.textContent = '▶ Start';
        }
    }

    function setupAutoplay() {
        document.getElementById('btn-autoplay').addEventListener('click', () => {
            autoplay = !autoplay;
            localStorage.setItem('clipq_autoplay', autoplay);
            updateAutoplayUI();
            console.log(`[App] Autoplay: ${autoplay ? 'ON' : 'OFF'}`);
        });
    }

    function updateAutoplayUI() {
        const sw = document.getElementById('autoplay-switch');
        if (sw) sw.classList.toggle('active', autoplay);
    }

    function setupQueueToggle() {
        const btnOpen = document.getElementById('btn-open');
        const btnClosed = document.getElementById('btn-closed');

        btnOpen.addEventListener('click', () => setQueueOpen(true));
        btnClosed.addEventListener('click', () => setQueueOpen(false));
    }

    function setupUserDropdown() {
        const toggle = document.getElementById('user-menu-toggle');
        const dropdown = document.getElementById('user-dropdown');

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => dropdown.classList.add('hidden'));
        dropdown.addEventListener('click', (e) => e.stopPropagation());

        document.getElementById('dropdown-settings').addEventListener('click', () => {
            dropdown.classList.add('hidden');
            ClipQ.Settings.populateUI();
            document.getElementById('settings-overlay').classList.remove('hidden');
        });

        document.getElementById('dropdown-logout').addEventListener('click', () => {
            dropdown.classList.add('hidden');
            ClipQ.Auth.logout();
        });
    }

    function setQueueOpen(open) {
        ClipQ.Queue.setOpen(open);
        const btnOpen = document.getElementById('btn-open');
        const btnClosed = document.getElementById('btn-closed');
        btnOpen.classList.toggle('active-open', open);
        btnClosed.classList.toggle('active-closed', !open);
        btnOpen.classList.remove('active-closed');
        btnClosed.classList.remove('active-open');
        console.log(`[App] Queue is now ${open ? 'OPEN' : 'CLOSED'}`);
    }

    function nextClip() {
        const next = ClipQ.Queue.next();
        if (next) {
            ClipQ.Player.playClip(next);
        } else {
            ClipQ.Player.showEmpty();
        }
        updateNextButton();
    }

    function getProviderIcon(provider) {
        const url = ClipQ.PROVIDER_ICONS[provider];
        if (!url) return '';
        return `<div class="queue-provider-icon"><img src="${url}" alt="${provider}"></div>`;
    }

    function renderQueueList() {
        const items = ClipQ.Queue.getItems();
        const container = document.getElementById('queue-list');
        const countEl = document.getElementById('queue-count');
        const countTabEl = document.getElementById('queue-count-tab');

        countEl.textContent = items.length;
        countTabEl.textContent = items.length > 0 ? `(${items.length})` : '';

        if (items.length === 0) {
            container.innerHTML = '<div class="queue-empty">Queue ist leer.<br>Warte auf Clips im Chat...</div>';
            return;
        }

        container.innerHTML = items.map(item => {
            const meta = item.meta || {};
            const thumb = meta.thumbnail || '';
            const icon = getProviderIcon(item.provider);
            return `
                <div class="queue-item" data-id="${item.id}">
                    <div class="queue-thumb-wrap">
                        ${thumb ? `<img class="queue-thumb" src="${thumb}" alt="">` : `<div class="queue-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--color-text-dim);font-size:22px">🎬</div>`}
                        ${icon}
                    </div>
                    <div class="queue-item-info">
                        <div class="queue-item-title">${meta.title || 'Clip'}</div>
                        <div class="queue-item-channel">${meta.channel || item.provider} • ${item.submitters[0]}</div>
                    </div>
                    ${item.pushCount > 1 ? `<span class="queue-item-badge">${item.pushCount}x</span>` : ''}
                    <button class="queue-item-delete" title="Entfernen">✕</button>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.queue-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.queue-item').dataset.id;
                ClipQ.Queue.removeById(id);
            });
        });
    }

    function renderHistory() {
        const hist = ClipQ.Queue.getHistory();
        const grid = document.getElementById('history-grid');

        if (hist.length === 0) {
            grid.innerHTML = '<div style="color:var(--color-text-dim);padding:40px;text-align:center">Noch keine Clips angesehen.</div>';
            return;
        }

        grid.innerHTML = hist.slice().reverse().map(item => {
            const meta = item.meta || {};
            return `
                <a class="history-item" href="${item.url}" target="_blank" rel="noopener">
                    ${meta.thumbnail ? `<img class="history-thumb" src="${meta.thumbnail}" alt="">` : `<div class="history-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--color-border);font-size:32px">🎬</div>`}
                    <div class="history-info">
                        <div class="history-title">${meta.title || 'Clip'}</div>
                        <div class="history-channel">${meta.channel || item.provider}</div>
                    </div>
                </a>
            `;
        }).join('');
    }

    function isAutoplay() { return autoplay; }

    return { init, nextClip, setQueueOpen, isAutoplay };
})();

document.addEventListener('DOMContentLoaded', () => ClipQ.App.init());
