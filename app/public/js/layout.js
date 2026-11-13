/**
 * layout.js — Layout rendering and positioning engine
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Layout = (() => {
    'use strict';

    function setElementHidden(el, hidden) {
        if (!el) return;
        el.style.visibility = hidden ? 'hidden' : '';
        el.style.pointerEvents = hidden ? 'none' : '';
        el.setAttribute('aria-hidden', String(!!hidden));
    }

    function apply(config) {
        if (!config) return;

        const mainLayout = document.querySelector('.main-layout');
        if (!mainLayout) return;

        // 1. Sidebar components visibility states
        const hasFacecam = config.showFacecam !== false;
        const hasChat = config.showChat !== false;
        const hasAd = config.showAd !== false;
        const hasQueue = config.showQueue !== false;
        const hasChatAd = hasChat || hasAd;
        const sidebarVisible = hasFacecam || hasChatAd || hasQueue;

        const sidebarEl = document.getElementById('sidebar');
        if (sidebarEl) {
            sidebarEl.style.display = sidebarVisible ? 'flex' : 'none';
        }

        // 2. Infobar and Sidebar Grid layout
        const w = config.playerWidth ?? 70;
        if (!sidebarVisible) {
            mainLayout.style.gridTemplateColumns = '1fr';
            if (config.infoPosition === 'above') {
                mainLayout.style.gridTemplateAreas = `
                    "info"
                    "player"
                `;
                mainLayout.style.gridTemplateRows = `var(--info-height) 1fr`;
            } else {
                mainLayout.style.gridTemplateAreas = `
                    "player"
                    "info"
                `;
                mainLayout.style.gridTemplateRows = `1fr var(--info-height)`;
            }
        } else {
            if (config.sidebarPosition === 'left') {
                mainLayout.style.gridTemplateColumns = `${100 - w}fr ${w}fr`;
                if (config.infoPosition === 'above') {
                    mainLayout.style.gridTemplateAreas = `
                        "sidebar info"
                        "sidebar player"
                    `;
                    mainLayout.style.gridTemplateRows = `var(--info-height) 1fr`;
                } else {
                    mainLayout.style.gridTemplateAreas = `
                        "sidebar player"
                        "sidebar info"
                    `;
                    mainLayout.style.gridTemplateRows = `1fr var(--info-height)`;
                }
            } else {
                mainLayout.style.gridTemplateColumns = `${w}fr ${100 - w}fr`;
                if (config.infoPosition === 'above') {
                    mainLayout.style.gridTemplateAreas = `
                        "info   sidebar"
                        "player sidebar"
                    `;
                    mainLayout.style.gridTemplateRows = `var(--info-height) 1fr`;
                } else {
                    mainLayout.style.gridTemplateAreas = `
                        "player sidebar"
                        "info   sidebar"
                    `;
                    mainLayout.style.gridTemplateRows = `1fr var(--info-height)`;
                }
            }
        }

        // 3. Sidebar elements display toggling
        const facecamEl = document.getElementById('facecam-area');
        const chatEl = document.getElementById('chat-area');
        const adEl = document.getElementById('ad-area');
        const chatAdRow = document.querySelector('.sidebar-chat-ad-row');
        const queueEl = document.getElementById('queue-section');

        if (facecamEl) facecamEl.style.display = hasFacecam ? 'block' : 'none';
        if (chatAdRow) chatAdRow.style.display = hasChatAd ? 'flex' : 'none';
        if (queueEl) queueEl.style.display = hasQueue ? 'flex' : 'none';

        setElementHidden(facecamEl, hasFacecam && !!config.hideFacecam);
        setElementHidden(chatEl, hasChat && !!config.hideChat);
        setElementHidden(adEl, hasAd && !!config.hideAd);
        setElementHidden(queueEl, hasQueue && !!config.hideQueue);

        const chatWidth = config.chatWidth ?? 60;

        if (chatEl) {
            chatEl.style.display = hasChat ? 'block' : 'none';
            if (hasChat && hasAd) {
                chatEl.style.width = `${chatWidth}%`;
                chatEl.style.flex = 'none';
            } else {
                chatEl.style.width = '100%';
                chatEl.style.flex = '';
            }
        }
        if (adEl) {
            adEl.style.display = hasAd ? '' : 'none';
            if (hasChat && hasAd) {
                adEl.style.width = `calc(${100 - chatWidth}% - var(--gap))`;
                adEl.style.flex = 'none';
            } else {
                adEl.style.width = '100%';
                adEl.style.flex = '';
            }
        }

        // 4. Heights and Flex weights
        const fcPercent = config.facecamHeightPercent ?? 40;
        const caPercent = config.chatAdHeightPercent ?? 25;
        const qPercent = config.queueHeightPercent ?? 35;

        // Expand facecam box to fill remaining space when only the queue is removed.
        let effectiveFcPercent = fcPercent;
        if (!hasQueue && hasFacecam) {
            effectiveFcPercent = fcPercent + qPercent;
        }

        const applyFlexSection = (el, active, weight) => {
            if (!el) return;
            el.style.flex = active ? `${weight} 1 0px` : '';
            el.style.height = active ? '0px' : '';
            el.style.minHeight = active ? '100px' : '';
        };

        applyFlexSection(facecamEl, hasFacecam, effectiveFcPercent);
        applyFlexSection(chatAdRow, hasChatAd, caPercent);

        if (chatEl) {
            chatEl.style.height = '100%';
        }
        if (adEl) {
            adEl.style.height = '100%';
        }

        applyFlexSection(queueEl, hasQueue, qPercent);

        // 5. Vertical ordering
        const defaultOrder = ['chat_ad', 'facecam', 'queue'];
        const order = Array.isArray(config.order) && config.order.length ? config.order : defaultOrder;
        const getOrder = (key) => {
            const idx = order.indexOf(key);
            return (idx >= 0 ? idx : defaultOrder.indexOf(key)) + 1;
        };

        if (chatAdRow) chatAdRow.style.order = getOrder('chat_ad');
        if (facecamEl) facecamEl.style.order = getOrder('facecam');
        if (queueEl) queueEl.style.order = getOrder('queue');
    }

    return { apply };
})();
