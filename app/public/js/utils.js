/**
 * utils.js - Shared sanitization, icon, and DOM toggle helpers for ClipQ
 */
window.ClipQ = window.ClipQ || {};

(() => {
    'use strict';

    const ROLE_BADGES = {
        broadcaster: 'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1',
        leadMod: 'https://assets.help.twitch.tv/article/img/000002212-07.png',
        mod: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1',
        vip: 'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1'
    };

    const PROVIDER_ICONS = {
        twitch: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png',
        twitch_vod: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png',
        youtube: 'https://img.icons8.com/color/48/youtube-play.png',
        tiktok: 'https://img.icons8.com/color/48/tiktok.png',
        instagram: 'https://img.icons8.com/color/48/instagram-new.png'
    };

    const PROVIDER_LARGE_ICONS = {
        youtube: 'https://img.icons8.com/color/512/youtube-play.png',
        tiktok: 'https://img.icons8.com/color/512/tiktok.png',
        instagram: 'https://img.icons8.com/color/512/instagram-new.png'
    };

    const PROVIDER_THUMB_FALLBACKS = {
        twitch: 'https://img.icons8.com/color/512/twitch.png',
        twitch_vod: 'https://img.icons8.com/color/512/twitch.png',
        youtube: 'https://img.icons8.com/color/512/youtube-play.png',
        tiktok: 'https://img.icons8.com/color/512/tiktok.png',
        instagram: 'https://img.icons8.com/color/512/instagram-new.png'
    };

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '';
        try {
            const parsed = new URL(url.trim());
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return parsed.href;
            }
        } catch { /* ignore invalid URLs */ }
        return '';
    }

    /** Parse an integer strictly, falling back only on NaN (preserving 0). */
    function intOrDefault(val, fallback) {
        const parsed = Number.parseInt(val, 10);
        return Number.isNaN(parsed) ? fallback : parsed;
    }

    /** Read the active state of a toggle-switch element, defaulting to true. */
    function getToggleState(id) {
        const el = document.getElementById(id);
        return el ? el.classList.contains('active') : true;
    }

    /** Update a toggle-switch element active class and ARIA state. */
    function setToggleState(id, active) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.toggle('active', !!active);
            el.setAttribute('aria-checked', String(!!active));
        }
    }

    /** Display a localized in-app Yes/Cancel confirmation modal. */
    function confirmAction({ message, yesLabel, cancelLabel }) {
        return new Promise((resolve) => {
            let overlay = document.querySelector('.confirm-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'modal-overlay confirm-overlay hidden';
                overlay.setAttribute('role', 'dialog');
                overlay.setAttribute('aria-modal', 'true');
                overlay.innerHTML = `
                <div class="modal confirm-modal">
                    <div class="modal-body confirm-modal-body"></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-ghost confirm-cancel-btn"></button>
                        <button type="button" class="btn btn-danger confirm-yes-btn"></button>
                    </div>
                </div>`;
                document.body.appendChild(overlay);
            }

            if (typeof overlay._closeActive === 'function') {
                overlay._closeActive(false);
            }

            const msgEl = overlay.querySelector('.confirm-modal-body');
            const cancelBtn = overlay.querySelector('.confirm-cancel-btn');
            const yesBtn = overlay.querySelector('.confirm-yes-btn');
            const previousFocus = document.activeElement;

            msgEl.textContent = message || '';
            cancelBtn.textContent = cancelLabel || 'Cancel';
            yesBtn.textContent = yesLabel || 'Yes';

            const close = (confirmed) => {
                overlay._closeActive = null;
                overlay.classList.add('hidden');
                cancelBtn.removeEventListener('click', onCancel);
                yesBtn.removeEventListener('click', onYes);
                overlay.removeEventListener('click', onBackdrop);
                document.removeEventListener('keydown', onKeydown);
                if (previousFocus && typeof previousFocus.focus === 'function') {
                    previousFocus.focus();
                }
                resolve(confirmed);
            };

            const onCancel = () => close(false);
            const onYes = () => close(true);
            const onBackdrop = (e) => {
                if (e.target === overlay) close(false);
            };
            const onKeydown = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    close(false);
                }
            };

            overlay._closeActive = close;
            cancelBtn.addEventListener('click', onCancel);
            yesBtn.addEventListener('click', onYes);
            overlay.addEventListener('click', onBackdrop);
            document.addEventListener('keydown', onKeydown);

            overlay.classList.remove('hidden');
            cancelBtn.focus();
        });
    }

    Object.assign(window.ClipQ, {
        ROLE_BADGES,
        PROVIDER_ICONS,
        PROVIDER_LARGE_ICONS,
        PROVIDER_THUMB_FALLBACKS,
        escapeHtml,
        sanitizeUrl,
        intOrDefault,
        getToggleState,
        setToggleState,
        confirmAction
    });
})();
