/**
 * chat-feed.js — Renders and formats live Twitch channel chat inside #chat-area
 */
window.ClipQ = window.ClipQ || {};

ClipQ.ChatFeed = (() => {
    'use strict';

    const MAX_MESSAGES = 120;
    const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

    let entries = [];
    let enabled = true;
    let showLinks = true;
    let direction = 'bottom';
    let animation = 'slide';
    let enterMs = 350;
    let hideSeconds = 0;
    let hideMode = 'slide';
    let exitMs = 350;
    let nextUid = 1;
    const expiryTimers = new Map();

    function getContainer() {
        return document.getElementById('chat-messages');
    }

    function clampDurationMs(val, fallback) {
        return Math.max(50, Math.min(2000, ClipQ.intOrDefault(val, fallback)));
    }

    function normalizeAnimMode(val, fallback) {
        return (val === 'slide' || val === 'none') ? val : fallback;
    }

    function sanitizeColor(rawColor) {
        if (typeof rawColor !== 'string') return '';
        const trimmed = rawColor.trim();
        return HEX_COLOR_RE.test(trimmed) ? trimmed : '';
    }

    function applyContainerClasses(container) {
        if (!container) return;
        container.classList.toggle('dir-top', direction === 'top');
        container.classList.toggle('dir-bottom', direction !== 'top');
        container.classList.toggle('anim-in-slide', animation === 'slide');
        container.classList.toggle('anim-out-slide', hideMode === 'slide');
        const root = document.documentElement.style;
        if (enterMs !== 350) root.setProperty('--chat-enter-duration', `${enterMs}ms`);
        else root.removeProperty('--chat-enter-duration');
        if (exitMs !== 350) root.setProperty('--chat-exit-duration', `${exitMs}ms`);
        else root.removeProperty('--chat-exit-duration');
    }

    function cancelTimer(uid) {
        const timerId = expiryTimers.get(uid);
        if (timerId !== undefined) {
            clearTimeout(timerId);
            expiryTimers.delete(uid);
        }
    }

    function clearAllTimers() {
        expiryTimers.forEach((timerId) => clearTimeout(timerId));
        expiryTimers.clear();
    }

    function expireEntry(uid) {
        expiryTimers.delete(uid);
        entries = entries.filter((item) => item._uid !== uid);
        const container = getContainer();
        if (!container) return;
        const row = Array.from(container.children).find((el) => el.dataset && Number(el.dataset.msgUid) === uid);
        if (!row) return;
        if (hideMode === 'slide') {
            row.classList.add('chat-msg-exit');
            setTimeout(() => { if (row.parentNode) row.remove(); }, exitMs + 20);
        } else {
            row.remove();
        }
    }

    function scheduleEntryExpiry(entry) {
        if (!entry || !entry._uid) return;
        cancelTimer(entry._uid);
        if (hideSeconds <= 0) return;
        const now = Date.now();
        if (!entry._expiresAt) entry._expiresAt = now + (hideSeconds * 1000);
        const delayMs = Math.max(0, entry._expiresAt - now);
        expiryTimers.set(entry._uid, setTimeout(() => expireEntry(entry._uid), delayMs));
    }

    function buildMessageRow(entry, isNewArrival) {
        const messageHtml = ClipQ.ChatEmotes && ClipQ.ChatEmotes.formatMessageHtml
            ? ClipQ.ChatEmotes.formatMessageHtml(entry.message, entry.emotes, showLinks)
            : ClipQ.escapeHtml(typeof entry.message === 'string' ? entry.message : '');
        if (!messageHtml) return null;

        const row = document.createElement('div');
        row.className = isNewArrival ? 'chat-msg chat-msg-enter' : 'chat-msg';
        if (entry._uid) row.dataset.msgUid = String(entry._uid);
        if (entry.id) row.dataset.msgId = String(entry.id);
        if (entry.login) row.dataset.user = String(entry.login).toLowerCase();

        const badgeHtml = ClipQ.ChatBadges && ClipQ.ChatBadges.renderBadgesHtml
            ? ClipQ.ChatBadges.renderBadgesHtml(entry.badges, entry.roles)
            : (ClipQ.buildRoleBadge ? ClipQ.buildRoleBadge(entry.roles) : '');
        const safeColor = sanitizeColor(entry.color);
        const colorAttr = safeColor ? ` style="color:${safeColor}"` : '';
        const safeAuthor = ClipQ.escapeHtml(entry.username || entry.login || 'unknown');

        row.innerHTML =
            (badgeHtml ? `<span class="chat-msg-badges">${badgeHtml}</span>` : '') +
            `<span class="chat-msg-author"${colorAttr}>${safeAuthor}</span>` +
            `<span class="chat-msg-sep">: </span>` +
            `<span class="chat-msg-text">${messageHtml}</span>`;
        return row;
    }

    function scrollToEdge(container) {
        if (!container) return;
        container.scrollTop = direction === 'top' ? 0 : container.scrollHeight;
    }

    function refresh() {
        const container = getContainer();
        clearAllTimers();
        if (!container) return;
        applyContainerClasses(container);
        container.textContent = '';

        const ordered = direction === 'top' ? entries.slice().reverse() : entries;
        const fragment = document.createDocumentFragment();
        ordered.forEach((entry) => {
            const row = buildMessageRow(entry, false);
            if (row) {
                fragment.appendChild(row);
                scheduleEntryExpiry(entry);
            }
        });
        container.appendChild(fragment);
        scrollToEdge(container);
    }

    function clear() {
        clearAllTimers();
        entries = [];
        const container = getContainer();
        if (container) container.textContent = '';
    }

    function setVisible(visible) {
        const container = getContainer();
        if (!container) return;
        container.classList.toggle('hidden', !visible);
        if (visible) scrollToEdge(container);
    }

    function setBadgesVisible(show) {
        document.body.classList.toggle('chat-badges-hidden', !show);
    }

    function applyTypography(designSettings) {
        const root = document.documentElement.style;
        const fontName = designSettings?.chatFontFamily;
        if (fontName && fontName !== 'Inter' && ClipQ.Design?.getFontValue) {
            root.setProperty('--chat-font-family', ClipQ.Design.getFontValue(fontName));
        } else if (fontName && fontName !== 'Inter') {
            root.setProperty('--chat-font-family', `'${fontName}', sans-serif`);
        } else {
            root.removeProperty('--chat-font-family');
        }
        const rawSize = ClipQ.intOrDefault(designSettings?.chatFontSize, 13);
        const fontSize = Math.max(11, Math.min(26, rawSize));
        if (fontSize !== 13) root.setProperty('--chat-font-size', `${fontSize}px`);
        else root.removeProperty('--chat-font-size');
    }

    function rescheduleTimersFromSettings(nextSec, nextMode, nextExitMs) {
        hideSeconds = Math.max(0, Math.min(3600, ClipQ.intOrDefault(nextSec, 0)));
        hideMode = normalizeAnimMode(nextMode, 'slide');
        exitMs = clampDurationMs(nextExitMs, 350);
        clearAllTimers();
        const now = Date.now();
        entries.forEach((entry) => {
            entry._expiresAt = hideSeconds > 0 ? now + (hideSeconds * 1000) : 0;
            scheduleEntryExpiry(entry);
        });
        applyContainerClasses(getContainer());
    }

    function applySettings(designSettings) {
        const s = designSettings || {};
        enabled = s.showChat !== false;
        const showBadges = s.chatShowBadges !== false;
        showLinks = s.chatShowLinks !== false;
        direction = s.chatDirection === 'top' ? 'top' : 'bottom';
        animation = normalizeAnimMode(s.chatAnimation, 'slide');
        enterMs = clampDurationMs(s.chatEnterMs, 350);
        hideSeconds = Math.max(0, Math.min(3600, ClipQ.intOrDefault(s.chatHideSeconds, 0)));
        hideMode = normalizeAnimMode(s.chatHideMode, 'slide');
        exitMs = clampDurationMs(s.chatExitMs, 350);
        entries.forEach((entry) => {
            entry._expiresAt = hideSeconds > 0 ? Date.now() + (hideSeconds * 1000) : 0;
        });

        setBadgesVisible(showBadges);
        applyTypography(s);
        if (!enabled) {
            clear();
        } else {
            refresh();
        }
        setVisible(enabled);
    }

    function setPreviewOption(key, value) {
        if (key === 'showBadges') {
            setBadgesVisible(value);
            return;
        }
        if (key === 'showLinks') {
            showLinks = value !== false;
            refresh();
            return;
        }
        if (key === 'direction') {
            direction = value === 'top' ? 'top' : 'bottom';
            refresh();
            return;
        }
        if (key === 'animation') {
            if (value && typeof value === 'object') {
                animation = normalizeAnimMode(value.chatAnimation, 'slide');
                enterMs = clampDurationMs(value.chatEnterMs, 350);
            } else {
                animation = normalizeAnimMode(value, 'slide');
            }
            applyContainerClasses(getContainer());
            return;
        }
        if (key === 'hideConfig') {
            rescheduleTimersFromSettings(value?.chatHideSeconds, value?.chatHideMode, value?.chatExitMs);
            return;
        }
        if (key === 'fontFamily' || key === 'fontSize') {
            applyTypography(value);
        }
    }

    function appendMessage(entry) {
        if (!enabled || !entry) return;
        const container = getContainer();
        if (!container) return;

        const storedEntry = {
            ...entry,
            _uid: nextUid++,
            _expiresAt: hideSeconds > 0 ? Date.now() + (hideSeconds * 1000) : 0
        };
        const row = buildMessageRow(storedEntry, true);
        if (!row) return;

        entries.push(storedEntry);
        if (entries.length > MAX_MESSAGES) {
            const dropped = entries.slice(0, entries.length - MAX_MESSAGES);
            dropped.forEach((item) => cancelTimer(item._uid));
            entries = entries.slice(-MAX_MESSAGES);
        }

        applyContainerClasses(container);
        const nearBottom = direction === 'bottom' &&
            (container.scrollHeight - container.scrollTop - container.clientHeight) < 48;
        const nearTop = direction === 'top' && container.scrollTop < 48;

        if (direction === 'top') {
            container.prepend(row);
            while (container.children.length > MAX_MESSAGES) {
                container.removeChild(container.lastElementChild);
            }
            if (nearTop) container.scrollTop = 0;
        } else {
            container.appendChild(row);
            while (container.children.length > MAX_MESSAGES) {
                container.removeChild(container.firstElementChild);
            }
            if (nearBottom) container.scrollTop = container.scrollHeight;
        }
        scheduleEntryExpiry(storedEntry);
    }

    function removeMessage(msgId) {
        const container = getContainer();
        if (!msgId) return;
        const target = String(msgId);
        entries = entries.filter((item) => {
            if (String(item.id || '') !== target) return true;
            cancelTimer(item._uid);
            return false;
        });
        if (!container) return;
        Array.from(container.children).forEach((el) => {
            if (el.dataset && el.dataset.msgId === target) el.remove();
        });
    }

    function removeUserMessages(username) {
        const container = getContainer();
        if (!username) return;
        const target = String(username).replace(/^@/, '').toLowerCase().trim();
        entries = entries.filter((item) => {
            if (String(item.login || '').toLowerCase() !== target) return true;
            cancelTimer(item._uid);
            return false;
        });
        if (!container) return;
        Array.from(container.children).forEach((el) => {
            if (el.dataset && el.dataset.user === target) el.remove();
        });
    }

    function appendTestMessage(sampleText) {
        const msg = `Kappa ${sampleText || 'Test chat message!'} https://clips.twitch.tv/ClipQTest`;
        appendMessage({
            id: `test_${Date.now()}_${nextUid}`,
            username: 'ClipQBot',
            login: 'clipqbot',
            color: '#ff6b6b',
            badges: { moderator: '1', subscriber: '12' },
            emotes: { 25: ['0-4'] },
            roles: { isMod: true },
            message: msg
        });
    }

    return {
        appendMessage,
        appendTestMessage,
        removeMessage,
        removeUserMessages,
        clear,
        refresh,
        setVisible,
        setPreviewOption,
        applySettings
    };
})();
