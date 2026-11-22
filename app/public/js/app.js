/**
 * app.js — Main application controller
 * Supports: i18n, login language selector, app title, command-exposed functions.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.App = (() => {
    'use strict';

    let currentView = 'queue';
    let autoplay = false; // Default: OFF
    const t = (key, params) => ClipQ.I18n.t(key, params);

    async function init() {
        // Apply saved language immediately
        ClipQ.I18n.applyToDOM();
        document.body.classList.toggle('obs-mode', ClipQ.Auth.isObsMode());
        if (ClipQ.Settings && ClipQ.Settings.applyTopbarVisibility) ClipQ.Settings.applyTopbarVisibility();

        const hashToken = ClipQ.Auth.parseTokenFromHash();
        const urlObsKey = ClipQ.Auth.getUrlObsKey ? ClipQ.Auth.getUrlObsKey() : null;
        if (!hashToken && urlObsKey && ClipQ.Sync?.initObsSession) {
            const obsRes = await ClipQ.Sync.initObsSession(urlObsKey);
            if (obsRes?.ok && obsRes.user) { await startApp(obsRes.user, { obsSession: true }); return; }
            if (obsRes?.invalid) { showLogin({ obsInvalid: true }); return; }
        }

        const token = hashToken || ClipQ.Auth.getToken();
        if (token) {
            const authStatus = await ClipQ.Auth.validate(token);
            if (authStatus?.valid) {
                const user = ClipQ.Auth.getUser() || await ClipQ.Auth.fetchUser(token);
                if (user) { await startApp(user); return; }
            } else if (authStatus?.unauthorized) {
                ClipQ.Auth.clearSession();
            }
        }
        showLogin();
    }

    function showLogin(options = {}) {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        const obsErr = document.getElementById('obs-error-banner');
        if (obsErr) obsErr.classList.toggle('hidden', !options.obsInvalid);

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

    async function startApp(user, options = {}) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');

        const avatarEl = document.getElementById('user-avatar');
        const safeAvatar = ClipQ.sanitizeUrl(user.avatar);
        avatarEl.onerror = () => { avatarEl.onerror = null; avatarEl.removeAttribute('src'); };
        if (safeAvatar) avatarEl.src = safeAvatar; else avatarEl.removeAttribute('src');
        document.getElementById('user-name').textContent = user.displayName || user.login || '';

        if (ClipQ.Sync && !options.obsSession) await ClipQ.Sync.init(user);

        const settings = ClipQ.Settings.load();
        if (!settings.channel) {
            settings.channel = user.login;
            ClipQ.Settings.save(settings);
        }
        if (user?.id && ClipQ.ChatBadges) ClipQ.ChatBadges.loadForChannel(user.id);
        if (user?.id && ClipQ.ChatEmotes) ClipQ.ChatEmotes.loadForChannel(user.id);

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
                    if (ClipQ.History) ClipQ.History.resetLimit();
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
        document.getElementById('btn-pause')?.addEventListener('click', () => {
            ClipQ.Player.togglePause();
        });
        document.getElementById('btn-share-chat')?.addEventListener('click', () => {
            const clip = ClipQ.Player.getCurrent();
            if (!clip) return;
            const rawUrl = clip.url ? (ClipQ.Providers?.getCanonicalUrl?.(clip.provider, clip.clipId, clip.url) || clip.url) : '';
            const safeClipUrl = ClipQ.sanitizeUrl(rawUrl);
            if (safeClipUrl && ClipQ.Chat && ClipQ.Chat.sendMessage) ClipQ.Chat.sendMessage(safeClipUrl);
        });
        document.getElementById('queue-clear-btn').addEventListener('click', () => {
            if (confirm(t('queue.confirm_clear'))) ClipQ.Queue.clear();
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

        if (ClipQ.History) ClipQ.History.init(renderClipThumbnail, bindThumbFallback);
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
        const current = ClipQ.Player.getCurrent();
        const isPaused = Boolean(current && ClipQ.Player.isPaused());
        const btn = document.getElementById('btn-next');
        btn.textContent = t(current ? 'player.next' : 'player.start');
        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) {
            pauseBtn.disabled = !current;
            pauseBtn.textContent = t(isPaused ? 'player.resume' : 'player.pause');
            pauseBtn.setAttribute('aria-pressed', String(isPaused));
        }
        const shareBtn = document.getElementById('btn-share-chat');
        if (shareBtn) shareBtn.disabled = !current;
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
            ClipQ.Settings.hideObsUrlCover();
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

    function renderQueueList(showBadgesOverride) {
        const items = ClipQ.Queue.getItems();
        const container = document.getElementById('queue-list');
        const countEl = document.getElementById('queue-count');
        const countTabEl = document.getElementById('queue-count-tab');

        countEl.textContent = items.length;
        countTabEl.textContent = items.length > 0 ? `(${items.length})` : '';

        if (items.length === 0) {
            const emptyMsgHtml = t('queue.empty_message').split(/<br\s*\/?>/i).map(ClipQ.escapeHtml).join('<br>');
            container.innerHTML = `<div class="queue-empty">${emptyMsgHtml}</div>`;
            return;
        }

        const trashIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
        const showBadges = typeof showBadgesOverride === 'boolean'
            ? showBadgesOverride
            : (ClipQ.Settings.get().design.showBadges !== false);

        container.innerHTML = items.map(item => {
            const meta = item.meta || {};
            const thumbMarkup = renderClipThumbnail(item, 'queue-thumb');
            const icon = getProviderIcon(item.provider);

            const submittersList = (item.submitters || []).map(sub => {
                const badge = (showBadges && item.submitterRoles) ? ClipQ.buildRoleBadge(item.submitterRoles[sub]) : '';
                return `${badge}${ClipQ.escapeHtml(sub)}`;
            }).join(', ');

            const pushCount = Math.max(0, ClipQ.intOrDefault(item.pushCount, 0));
            const pushBadge = pushCount > 1
                ? (() => {
                    const m = 1 + Math.min(9, pushCount - 1) * (1.5 / 9);
                    return `<span class="queue-item-badge" style="font-size:${12 * m}px; padding:${3 * m}px ${8 * m}px; border-radius:${4 * m}px">${pushCount}x</span>`;
                })()
                : '';

            return `<div class="queue-item" data-id="${ClipQ.escapeHtml(item.id)}" tabindex="0" role="button" title="${ClipQ.escapeHtml(t('queue.click_to_play'))}">
                <div class="queue-thumb-wrap">${thumbMarkup}${icon}</div>
                <div class="queue-item-info">
                    <div class="queue-item-title">${ClipQ.escapeHtml(meta.title || 'Clip')}</div>
                    <div class="queue-item-channel">${ClipQ.escapeHtml(meta.channel || item.provider)} • ${submittersList}${item.isPushed ? ` • <span class="badge-pushed">${ClipQ.escapeHtml(t('queue.pushed'))}</span>` : ''}</div>
                </div>
                ${pushBadge}
                <button type="button" class="queue-item-delete" title="${ClipQ.escapeHtml(t('queue.delete'))}" aria-label="${ClipQ.escapeHtml(t('queue.delete'))}">${trashIcon}</button>
            </div>`;
        }).join('');
    }

    function renderHistory() {
        if (ClipQ.History) ClipQ.History.render(renderClipThumbnail);
    }

    function isAutoplay() { return autoplay; }

    function applyRemoteConfig() {
        const settings = ClipQ.Settings.load();
        const titleEl = document.getElementById('app-title');
        if (titleEl) titleEl.textContent = settings.appTitle || 'ClipQ';
        try { autoplay = localStorage.getItem('clipq_autoplay') === 'true'; } catch { autoplay = false; }
        if (!autoplay && ClipQ.Player?.clearAutoplayTimeout) ClipQ.Player.clearAutoplayTimeout();
        updateAutoplayUI();
        if (ClipQ.Design?.renderSwatches) ClipQ.Design.renderSwatches();
        if (ClipQ.SettingsLayout?.renderOrderingUI) ClipQ.SettingsLayout.renderOrderingUI();
        if (ClipQ.Player?.refreshLanguage) ClipQ.Player.refreshLanguage();
        renderQueueList();
        renderHistory();
        updateNextButton();
        const overlay = document.getElementById('settings-overlay');
        if (overlay && !overlay.classList.contains('hidden')) ClipQ.Settings.populateUI();
    }

    document.addEventListener('DOMContentLoaded', () => ClipQ.App.init());

    return {
        init, nextClip, skipUnavailableClip, setQueueOpen, isAutoplay, setAutoplay,
        setClipLimit, setProvider, renderQueueList, renderHistory, updateNextButton, applyRemoteConfig
    };
})();
