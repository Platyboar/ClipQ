/**
 * app.js — Main application controller
 * Supports: i18n, login language selector, app title, command-exposed functions.
 */
console.log('[ClipQ] app.js loaded — version 9');
window.ClipQ = window.ClipQ || {};

// Provider icon URLs (small favicons)
ClipQ.PROVIDER_ICONS = {
    twitch: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png',
    youtube: 'https://www.youtube.com/favicon.ico',
    tiktok: 'https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uhtyvueh7nulogpouzhm/tiktok-icon2.png',
    instagram: 'https://img.icons8.com/color/48/instagram-new.png',
    default: 'https://cdn-icons-png.flaticon.com/512/2875/2875438.png'
};

ClipQ.App = (() => {
    let currentView = 'queue';
    let autoplay = false; // Default: OFF
    const t = (key, params) => ClipQ.I18n.t(key, params);

    async function init() {
        // Apply saved language immediately
        ClipQ.I18n.applyToDOM();

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

        const hasLang = ClipQ.I18n.hasLanguage();
        const langSelector = document.getElementById('language-selector');
        const loginBtn = document.getElementById('twitch-login-btn');

        if (hasLang) {
            // Language already chosen — hide selector, show login button
            langSelector.classList.add('hidden');
            loginBtn.classList.remove('hidden');
        } else {
            // First visit — show language selector
            langSelector.classList.remove('hidden');
            loginBtn.classList.add('hidden');
            populateLanguageSelector();
        }

        loginBtn.addEventListener('click', () => {
            window.location.href = ClipQ.Auth.getLoginUrl();
        });
    }

    function populateLanguageSelector() {
        const container = document.getElementById('language-options');
        const langs = ClipQ.I18n.getAvailableLanguages();

        container.innerHTML = langs.map(lang => `
            <button class="language-btn" data-lang="${lang.code}">
                <img class="lang-flag" src="${lang.flag}" alt="${lang.name}">
                <span>${lang.name}</span>
            </button>
        `).join('');

        container.querySelectorAll('.language-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                ClipQ.I18n.setLanguage(lang);

                // Animate: fade out language selector, show login button
                const selector = document.getElementById('language-selector');
                selector.classList.add('fade-out');

                setTimeout(() => {
                    selector.classList.add('hidden');
                    const loginBtn = document.getElementById('twitch-login-btn');
                    loginBtn.classList.remove('hidden');
                    loginBtn.classList.add('slide-in');
                }, 300);
            });
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

        // Apply app title
        const titleEl = document.getElementById('app-title');
        if (titleEl) titleEl.textContent = settings.appTitle || 'ClipQ';

        autoplay = localStorage.getItem('clipq_autoplay') === 'true';
        updateAutoplayUI();

        // Apply i18n to DOM after app screen is shown
        ClipQ.I18n.applyToDOM();

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
            if (confirm(t('queue.confirm_clear'))) ClipQ.Queue.clear();
        });
    }

    /** Handle "Start" vs "Next" button */
    function handleNextButton() {
        if (!ClipQ.Player.getCurrent()) {
            const first = ClipQ.Queue.start();
            if (first) {
                ClipQ.Player.playClip(first);
                updateNextButton();
            }
        } else {
            nextClip();
        }
    }

    function updateNextButton() {
        const btn = document.getElementById('btn-next');
        if (ClipQ.Player.getCurrent()) {
            btn.textContent = t('player.next');
        } else {
            btn.textContent = t('player.start');
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

    /** Set autoplay state (called by chat command) */
    function setAutoplay(state) {
        autoplay = !!state;
        localStorage.setItem('clipq_autoplay', autoplay);
        updateAutoplayUI();
        console.log(`[App] Autoplay set to: ${autoplay ? 'ON' : 'OFF'}`);
    }

    /** Set clip limit (called by chat command) */
    function setClipLimit(num) {
        const settings = ClipQ.Settings.get();
        settings.userClipLimit = num;
        ClipQ.Settings.save(settings);
        console.log(`[App] Clip limit set to: ${num}`);
    }

    /** Toggle a provider on/off (called by chat command) */
    function setProvider(providerName, enabled) {
        const settings = ClipQ.Settings.get();
        if (settings.providers.hasOwnProperty(providerName)) {
            settings.providers[providerName] = enabled;
            ClipQ.Settings.save(settings);
            console.log(`[App] Provider "${providerName}" set to: ${enabled ? 'ON' : 'OFF'}`);
        } else {
            console.warn(`[App] Unknown provider: "${providerName}"`);
        }
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
            container.innerHTML = `<div class="queue-empty">${t('queue.empty_message')}</div>`;
            return;
        }

        container.innerHTML = items.map(item => {
            const meta = item.meta || {};
            let thumb = meta.thumbnail || '';
            let thumbClass = 'queue-thumb';
            if (item.provider === 'instagram') {
                thumb = 'https://img.icons8.com/color/512/instagram-new.png';
                thumbClass += ' instagram-logo';
            }
            const icon = getProviderIcon(item.provider);

            // Delete SVG icon (Trash)
            const trashIcon = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

            const showBadges = ClipQ.Settings.get().design.showBadges !== false;
            const submittersList = item.submitters.map(sub => {
                let badge = '';
                if (showBadges && item.submitterRoles && item.submitterRoles[sub]) {
                    const roles = item.submitterRoles[sub];
                    if (roles.isBroadcaster) {
                        badge = '<img class="badge-role" src="https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1" title="Streamer" alt="Streamer">';
                    } else if (roles.isLeadMod) {
                        badge = '<img class="badge-role" src="https://img.icons8.com/color/48/crossed-swords.png" title="Lead-Moderator" alt="Lead-Moderator">';
                    } else if (roles.isMod) {
                        badge = '<img class="badge-role" src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1" title="Moderator" alt="Moderator">';
                    } else if (roles.isVip) {
                        badge = '<img class="badge-role" src="https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1" title="VIP" alt="VIP">';
                    }
                }
                return `${badge}${sub}`;
            }).join(', ');

            return `
                <div class="queue-item" data-id="${item.id}" title="${t('queue.click_to_play')}">
                    <div class="queue-thumb-wrap">
                        ${thumb ? `<img class="${thumbClass}" src="${thumb}" alt="">` : `<div class="queue-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--color-text-dim);font-size:22px">🎬</div>`}
                        ${icon}
                    </div>
                    <div class="queue-item-info">
                        <div class="queue-item-title">${meta.title || 'Clip'}</div>
                        <div class="queue-item-channel">${meta.channel || item.provider} • ${submittersList}${item.isPushed ? ` • <span class="badge-pushed">${t('queue.pushed')}</span>` : ''}</div>
                    </div>
                    ${(() => {
                        if (item.pushCount <= 1) return '';
                        const m = 1 + Math.min(9, item.pushCount - 1) * (1.5 / 9);
                        return `<span class="queue-item-badge" style="font-size:${12*m}px; padding:${3*m}px ${8*m}px; border-radius:${4*m}px">${item.pushCount}x</span>`;
                    })()}
                    <button class="queue-item-delete" title="${t('queue.delete')}">${trashIcon}</button>
                </div>
            `;
        }).join('');

        // Handle delete clicks
        container.querySelectorAll('.queue-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.closest('.queue-item').dataset.id;
                ClipQ.Queue.removeById(id);
            });
        });

        // Handle item clicks for direct play
        container.querySelectorAll('.queue-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const newClip = ClipQ.Queue.extractAndPlay(id);
                if (newClip) {
                    ClipQ.Player.playClip(newClip);
                    updateNextButton();
                }
            });
        });
    }

    function renderHistory() {
        const hist = ClipQ.Queue.getHistory();
        const grid = document.getElementById('history-grid');

        if (hist.length === 0) {
            grid.innerHTML = `<div style="color:var(--color-text-dim);padding:40px;text-align:center">${t('history.empty')}</div>`;
            return;
        }

        grid.innerHTML = hist.slice().reverse().map(item => {
            const meta = item.meta || {};
            let thumb = meta.thumbnail || '';
            let thumbClass = 'history-thumb';
            if (item.provider === 'instagram') {
                thumb = 'https://img.icons8.com/color/512/instagram-new.png';
                thumbClass += ' instagram-logo';
            }
            return `
                <a class="history-item" href="${item.url}" target="_blank" rel="noopener">
                    ${thumb ? `<img class="${thumbClass}" src="${thumb}" alt="">` : `<div class="history-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--color-border);font-size:32px">🎬</div>`}
                    <div class="history-info">
                        <div class="history-title">${meta.title || 'Clip'}</div>
                        <div class="history-channel">${meta.channel || item.provider}</div>
                    </div>
                </a>
            `;
        }).join('');
    }

    function isAutoplay() { return autoplay; }

    return { init, nextClip, setQueueOpen, isAutoplay, setAutoplay, setClipLimit, setProvider, renderQueueList };
})();

document.addEventListener('DOMContentLoaded', () => ClipQ.App.init());
