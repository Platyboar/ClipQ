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

    function getContainer() {
        return document.getElementById('chat-messages');
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
        container.classList.toggle('anim-slide', animation === 'slide');
    }

    function buildMessageRow(entry, isNewArrival) {
        const messageHtml = ClipQ.ChatEmotes && ClipQ.ChatEmotes.formatMessageHtml
            ? ClipQ.ChatEmotes.formatMessageHtml(entry.message, entry.emotes, showLinks)
            : ClipQ.escapeHtml(typeof entry.message === 'string' ? entry.message : '');
        if (!messageHtml) return null;

        const row = document.createElement('div');
        row.className = isNewArrival ? 'chat-msg chat-msg-enter' : 'chat-msg';
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
        if (!container) return;
        applyContainerClasses(container);
        container.textContent = '';

        const ordered = direction === 'top' ? entries.slice().reverse() : entries;
        const fragment = document.createDocumentFragment();
        ordered.forEach((entry) => {
            const row = buildMessageRow(entry, false);
            if (row) fragment.appendChild(row);
        });
        container.appendChild(fragment);
        scrollToEdge(container);
    }

    function clear() {
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

    function applySettings(designSettings) {
        const s = designSettings || {};
        enabled = s.showChat !== false;
        const showBadges = s.chatShowBadges !== false;
        showLinks = s.chatShowLinks !== false;
        direction = s.chatDirection === 'top' ? 'top' : 'bottom';
        animation = s.chatAnimation === 'none' ? 'none' : 'slide';

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
            animation = value === 'none' ? 'none' : 'slide';
            applyContainerClasses(getContainer());
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

        entries.push(entry);
        if (entries.length > MAX_MESSAGES) {
            entries = entries.slice(-MAX_MESSAGES);
        }

        const row = buildMessageRow(entry, true);
        if (!row) return;

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
    }

    function removeMessage(msgId) {
        const container = getContainer();
        if (!msgId) return;
        const target = String(msgId);
        entries = entries.filter((item) => String(item.id || '') !== target);
        if (!container) return;
        Array.from(container.children).forEach((el) => {
            if (el.dataset && el.dataset.msgId === target) el.remove();
        });
    }

    function removeUserMessages(username) {
        const container = getContainer();
        if (!username) return;
        const target = String(username).replace(/^@/, '').toLowerCase().trim();
        entries = entries.filter((item) => String(item.login || '').toLowerCase() !== target);
        if (!container) return;
        Array.from(container.children).forEach((el) => {
            if (el.dataset && el.dataset.user === target) el.remove();
        });
    }

    return {
        appendMessage,
        removeMessage,
        removeUserMessages,
        clear,
        refresh,
        setVisible,
        setPreviewOption,
        applySettings
    };
})();
