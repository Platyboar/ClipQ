/**
 * app.js — Main application controller
 * Supports: i18n, login language selector, app title, command-exposed functions.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.App = (() => {
    'use strict';

    let currentView = 'queue';
    let autoplay = false; // Default: OFF
    let historyRenderLimit = 200;
    const t = (key, params) => ClipQ.I18n.t(key, params);

    async function init() {
        // Apply saved language immediately
        ClipQ.I18n.applyToDOM();

        const hashToken = ClipQ.Auth.parseTokenFromHash();
        const savedToken = ClipQ.Auth.getToken();
        const token = hashToken || savedToken;

        if (token) {
            const authStatus = await ClipQ.Auth.validate(token);
            if (authStatus && authStatus.valid) {
                let user = ClipQ.Auth.getUser();
                if (!user) user = await ClipQ.Auth.fetchUser(token);
                if (user) {
                    await startApp(user);
                    return;
                }
            } else if (authStatus && authStatus.unauthorized) {
                ClipQ.Auth.clearSession();
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

        container.innerHTML = langs.map(lang => {
            const rawFlag = typeof lang.flag === 'string' ? lang.flag : '';
            const safeFlag = ClipQ.sanitizeUrl(rawFlag) || (/^\/(?!\/)/.test(rawFlag) ? rawFlag : '');
            const safeName = ClipQ.escapeHtml(lang.name);
            return `
            <button type="button" class="language-btn" data-lang="${ClipQ.escapeHtml(lang.code)}">
                ${safeFlag ? `<img class="lang-flag" src="${ClipQ.escapeHtml(safeFlag)}" alt="${safeName}">` : ''}
                <span>${safeName}</span>
            </button>
        `;
        }).join('');

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

    async function startApp(user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');

        const avatarEl = document.getElementById('user-avatar');
        const safeAvatar = ClipQ.sanitizeUrl(user.avatar);
        if (safeAvatar) avatarEl.src = safeAvatar;
        else avatarEl.removeAttribute('src');
        document.getElementById('user-name').textContent = user.displayName;

        if (ClipQ.Sync) await ClipQ.Sync.init(user);

        const settings = ClipQ.Settings.load();
        if (!settings.channel) {
            settings.channel = user.login;
            ClipQ.Settings.save(settings);
        }

        const titleEl = document.getElementById('app-title');
        if (titleEl) titleEl.textContent = settings.appTitle || 'ClipQ';

        try { autoplay = localStorage.getItem('clipq_autoplay') === 'true'; } catch { autoplay = false; }
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
                document.querySelectorAll('.menu-tabs .tab').forEach(tabEl => tabEl.classList.remove('active'));
                tab.classList.add('active');
                currentView = tab.dataset.tab;

                document.getElementById('queue-view').classList.toggle('hidden', currentView !== 'queue');
                document.getElementById('history-view').classList.toggle('hidden', currentView !== 'history');

                if (currentView === 'history') {
                    historyRenderLimit = 200;
                    renderHistory();
                }
            });
        });
    }

    function setupControls() {
        document.getElementById('btn-next').addEventListener('click', handleNextButton);
        document.getElementById('btn-prev').addEventListener('click', () => {
            const prev = ClipQ.Queue.previousFromHistory();
            if (prev) { ClipQ.Player.playClip(prev); updateNextButton(); }
        });
        document.getElementById('queue-clear-btn').addEventListener('click', () => {
            if (confirm(t('queue.confirm_clear'))) ClipQ.Queue.clear();
        });
        document.getElementById('history-load-more-btn')?.addEventListener('click', () => {
            historyRenderLimit += 200;
            renderHistory();
        });

        const queueContainer = document.getElementById('queue-list');
        if (queueContainer) {
            bindThumbFallback(queueContainer);
            const playFromElement = (el) => {
                const newClip = ClipQ.Queue.extractAndPlay(el.dataset.id);
                if (newClip) { ClipQ.Player.playClip(newClip); updateNextButton(); }
            };
            queueContainer.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.queue-item-delete');
                if (deleteBtn) {
                    e.stopPropagation();
                    const row = deleteBtn.closest('.queue-item');
                    if (row) ClipQ.Queue.removeById(row.dataset.id);
                    return;
                }
                const itemEl = e.target.closest('.queue-item');
                if (itemEl) playFromElement(itemEl);
            });
            queueContainer.addEventListener('keydown', (e) => {
                if (e.target.closest('.queue-item-delete')) return;
                const itemEl = e.target.closest('.queue-item');
                if (itemEl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); playFromElement(itemEl); }
            });
        }

        const historyGrid = document.getElementById('history-grid');
        if (historyGrid) {
            bindThumbFallback(historyGrid);
            historyGrid.addEventListener('click', async (e) => {
                const deleteBtn = e.target.closest('.history-item-delete');
                if (!deleteBtn) return;
                e.preventDefault();
                e.stopPropagation();
                const id = deleteBtn.closest('.history-item')?.dataset.id;
                if (!id) return;
                const confirmed = await ClipQ.confirmAction({
                    message: t('history.confirm_delete'),
                    yesLabel: t('history.confirm_yes'),
                    cancelLabel: t('history.confirm_cancel')
                });
                if (!confirmed) return;
                const result = ClipQ.Queue.removeHistoryById(id);
                if (result.removed) {
                    if (result.clearedActivePlayback) { ClipQ.Player.showEmpty(); updateNextButton(); }
                    renderHistory();
                }
            });
        }
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
        btn.textContent = t(ClipQ.Player.getCurrent() ? 'player.next' : 'player.start');
    }

    function applyAutoplayState(state) {
        autoplay = !!state;
        try { localStorage.setItem('clipq_autoplay', autoplay); } catch { /* ignore storage quota errors */ }
        if (!autoplay && ClipQ.Player && ClipQ.Player.clearAutoplayTimeout) ClipQ.Player.clearAutoplayTimeout();
        updateAutoplayUI();
        if (ClipQ.Sync) ClipQ.Sync.scheduleConfigSave();
        console.log(`[App] Autoplay set to: ${autoplay ? 'ON' : 'OFF'}`);
    }

    function setupAutoplay() {
        document.getElementById('btn-autoplay').addEventListener('click', () => {
            applyAutoplayState(!autoplay);
        });
    }

    function updateAutoplayUI() {
        const sw = document.getElementById('autoplay-switch');
        if (sw) sw.classList.toggle('active', autoplay);
        const btn = document.getElementById('btn-autoplay');
        if (btn) btn.setAttribute('aria-pressed', String(autoplay));
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

        const setDropdownOpen = (isOpen) => {
            dropdown.classList.toggle('hidden', !isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        };

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            setDropdownOpen(dropdown.classList.contains('hidden'));
        });

        document.addEventListener('click', () => setDropdownOpen(false));
        dropdown.addEventListener('click', (e) => e.stopPropagation());

        document.getElementById('dropdown-settings').addEventListener('click', () => {
            setDropdownOpen(false);
            ClipQ.Settings.populateUI();
            document.getElementById('settings-overlay').classList.remove('hidden');
        });

        document.getElementById('dropdown-logout').addEventListener('click', () => {
            setDropdownOpen(false);
            ClipQ.Auth.logout();
        });
    }

    function setQueueOpen(open) {
        ClipQ.Queue.setOpen(open);
        const btnOpen = document.getElementById('btn-open');
        const btnClosed = document.getElementById('btn-closed');
        btnOpen.classList.toggle('active-open', open);
        btnClosed.classList.toggle('active-closed', !open);
        btnOpen.setAttribute('aria-pressed', String(open));
        btnClosed.setAttribute('aria-pressed', String(!open));
        console.log(`[App] Queue is now ${open ? 'OPEN' : 'CLOSED'}`);
    }

    function advanceClip(archive = true) {
        const next = archive ? ClipQ.Queue.next() : ClipQ.Queue.skipCurrent();
        if (next) ClipQ.Player.playClip(next);
        else ClipQ.Player.showEmpty();
        updateNextButton();
    }

    function nextClip() { advanceClip(true); }
    function skipUnavailableClip() { advanceClip(false); }

    /** Set autoplay state (called by chat command) */
    function setAutoplay(state) {
        applyAutoplayState(state);
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
        if (Object.prototype.hasOwnProperty.call(settings.providers, providerName)) {
            settings.providers[providerName] = enabled;
            ClipQ.Settings.save(settings);
            console.log(`[App] Provider "${providerName}" set to: ${enabled ? 'ON' : 'OFF'}`);
        } else {
            console.warn(`[App] Unknown provider: "${providerName}"`);
        }
    }

    function getProviderIcon(provider) {
        const url = ClipQ.sanitizeUrl(ClipQ.PROVIDER_ICONS[provider]);
        if (!url) return '';
        return `<div class="queue-provider-icon"><img src="${ClipQ.escapeHtml(url)}" alt="${ClipQ.escapeHtml(provider)}"></div>`;
    }

    function buildRoleBadge(roles) {
        if (!roles) return '';
        const roleDefs = [
            ['isBroadcaster', 'broadcaster', 'roles.broadcaster'],
            ['isLeadMod', 'leadMod', 'roles.lead_mod'],
            ['isMod', 'mod', 'roles.mod'],
            ['isVip', 'vip', 'roles.vip']
        ];
        const match = roleDefs.find(([flag]) => roles[flag]);
        if (!match) return '';
        const [, badgeKey, i18nKey] = match;
        const badgeUrl = ClipQ.sanitizeUrl(ClipQ.ROLE_BADGES[badgeKey]);
        if (!badgeUrl) return '';
        const label = ClipQ.escapeHtml(t(i18nKey));
        return `<img class="badge-role" src="${ClipQ.escapeHtml(badgeUrl)}" title="${label}" alt="${label}">`;
    }

    function bindThumbFallback(container) {
        container.addEventListener('error', (e) => {
            const img = e.target;
            if (img?.tagName !== 'IMG') return;
            const fallback = img.dataset.fallbackLogo;
            if (!fallback || img.dataset.fallbackApplied) return;
            img.dataset.fallbackApplied = '1';
            img.classList.add('platform-logo');
            img.src = fallback;
        }, true);
    }

    function renderClipThumbnail(item, baseClass) {
        const meta = item.meta || {};
        const fallbackLogo = ClipQ.sanitizeUrl(ClipQ.PROVIDER_THUMB_FALLBACKS?.[item.provider] || '');
        const rawThumb = item.provider === 'instagram' ? fallbackLogo : (meta.thumbnail || fallbackLogo);
        const safeThumb = ClipQ.sanitizeUrl(rawThumb);
        const isLogo = safeThumb && safeThumb === fallbackLogo;
        const thumbClass = isLogo ? `${baseClass} platform-logo` : baseClass;
        const fallbackAttr = fallbackLogo && !isLogo ? ` data-fallback-logo="${ClipQ.escapeHtml(fallbackLogo)}"` : '';
        const lazyAttr = baseClass === 'history-thumb' ? ' loading="lazy"' : '';
        return safeThumb
            ? `<img class="${thumbClass}" src="${ClipQ.escapeHtml(safeThumb)}"${fallbackAttr}${lazyAttr} alt="">`
            : `<div class="${baseClass} clip-placeholder">🎬</div>`;
    }

    function renderQueueList() {
        const items = ClipQ.Queue.getItems();
        const container = document.getElementById('queue-list');
        const countEl = document.getElementById('queue-count');
        const countTabEl = document.getElementById('queue-count-tab');

        countEl.textContent = items.length;
        countTabEl.textContent = items.length > 0 ? `(${items.length})` : '';

        if (items.length === 0) {
            const emptyMsgHtml = t('queue.empty_message')
                .split(/<br\s*\/?>/i)
                .map(ClipQ.escapeHtml)
                .join('<br>');
            container.innerHTML = `<div class="queue-empty">${emptyMsgHtml}</div>`;
            return;
        }

        const trashIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
        const showBadges = ClipQ.Settings.get().design.showBadges !== false;

        container.innerHTML = items.map(item => {
            const meta = item.meta || {};
            const thumbMarkup = renderClipThumbnail(item, 'queue-thumb');
            const icon = getProviderIcon(item.provider);

            const submittersList = (item.submitters || []).map(sub => {
                const badge = (showBadges && item.submitterRoles) ? buildRoleBadge(item.submitterRoles[sub]) : '';
                return `${badge}${ClipQ.escapeHtml(sub)}`;
            }).join(', ');

            const pushCount = Math.max(0, ClipQ.intOrDefault(item.pushCount, 0));
            const pushBadge = pushCount > 1
                ? (() => {
                    const m = 1 + Math.min(9, pushCount - 1) * (1.5 / 9);
                    return `<span class="queue-item-badge" style="font-size:${12 * m}px; padding:${3 * m}px ${8 * m}px; border-radius:${4 * m}px">${pushCount}x</span>`;
                })()
                : '';

            return `
                <div class="queue-item" data-id="${ClipQ.escapeHtml(item.id)}" tabindex="0" role="button" title="${ClipQ.escapeHtml(t('queue.click_to_play'))}">
                    <div class="queue-thumb-wrap">
                        ${thumbMarkup}
                        ${icon}
                    </div>
                    <div class="queue-item-info">
                        <div class="queue-item-title">${ClipQ.escapeHtml(meta.title || 'Clip')}</div>
                        <div class="queue-item-channel">${ClipQ.escapeHtml(meta.channel || item.provider)} • ${submittersList}${item.isPushed ? ` • <span class="badge-pushed">${ClipQ.escapeHtml(t('queue.pushed'))}</span>` : ''}</div>
                    </div>
                    ${pushBadge}
                    <button type="button" class="queue-item-delete" title="${ClipQ.escapeHtml(t('queue.delete'))}" aria-label="${ClipQ.escapeHtml(t('queue.delete'))}">${trashIcon}</button>
                </div>
            `;
        }).join('');
    }

    function renderHistory() {
        const view = document.getElementById('history-view');
        if (view && view.classList.contains('hidden')) return;

        const hist = ClipQ.Queue.getHistory();
        const grid = document.getElementById('history-grid');
        const moreWrap = document.getElementById('history-more-wrap');
        const moreBtn = document.getElementById('history-load-more-btn');
        if (hist.length === 0) {
            grid.innerHTML = `<div class="history-empty">${ClipQ.escapeHtml(t('history.empty'))}</div>`;
            if (moreWrap) moreWrap.classList.add('hidden');
            return;
        }

        const deleteTitle = ClipQ.escapeHtml(t('history.delete'));
        const closeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        const visible = hist.slice().reverse().slice(0, historyRenderLimit);
        grid.innerHTML = visible.map(item => {
            const meta = item.meta || {};
            const rawUrl = ClipQ.Providers?.getCanonicalUrl ? ClipQ.Providers.getCanonicalUrl(item.provider, item.clipId, item.url) : item.url;
            const safeUrl = ClipQ.sanitizeUrl(rawUrl);
            const inner = `${renderClipThumbnail(item, 'history-thumb')}<div class="history-info"><div class="history-title">${ClipQ.escapeHtml(meta.title || 'Clip')}</div><div class="history-channel">${ClipQ.escapeHtml(meta.channel || item.provider)}</div></div>`;
            const body = safeUrl ? `<a class="history-item-link" href="${ClipQ.escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : inner;
            return `<div class="history-item" data-id="${ClipQ.escapeHtml(item.id || '')}">${body}<button type="button" class="history-item-delete" title="${deleteTitle}" aria-label="${deleteTitle}">${closeIcon}</button></div>`;
        }).join('');

        const remaining = hist.length - visible.length;
        if (moreWrap && moreBtn) {
            moreWrap.classList.toggle('hidden', remaining <= 0);
            if (remaining > 0) moreBtn.textContent = t('history.load_more', { count: remaining });
        }
    }

    function isAutoplay() { return autoplay; }

    document.addEventListener('DOMContentLoaded', () => ClipQ.App.init());

    return {
        init, nextClip, skipUnavailableClip, setQueueOpen, isAutoplay, setAutoplay,
        setClipLimit, setProvider, renderQueueList, renderHistory, updateNextButton
    };
})();
