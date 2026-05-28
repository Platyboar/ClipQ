/**
 * layout.js — Layout rendering and positioning engine
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Layout = (() => {
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
        const w = config.playerWidth || 70;
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

        const chatWidth = config.chatWidth || 60;

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
            adEl.style.display = hasAd ? 'block' : 'none';
            if (hasChat && hasAd) {
                adEl.style.width = `calc(${100 - chatWidth}% - var(--gap))`;
                adEl.style.flex = 'none';
            } else {
                adEl.style.width = '100%';
                adEl.style.flex = '';
            }
        }

        // 4. Heights and Flex weights
        const fcPercent = config.facecamHeightPercent || 40;
        const caPercent = config.chatAdHeightPercent || 25;
        const qPercent = config.queueHeightPercent || 35;

        // "wenn queue als einziges ausgeblendet wird, soll facecam den platz einnehmen."
        let effectiveFcPercent = fcPercent;
        if (!hasQueue && hasFacecam) {
            effectiveFcPercent = fcPercent + qPercent;
        }

        if (facecamEl) {
            facecamEl.style.flex = hasFacecam ? `${effectiveFcPercent} 1 0px` : '';
            facecamEl.style.height = hasFacecam ? '0px' : '';
            facecamEl.style.minHeight = hasFacecam ? '100px' : '';
        }

        if (chatAdRow) {
            chatAdRow.style.flex = hasChatAd ? `${caPercent} 1 0px` : '';
            chatAdRow.style.height = hasChatAd ? '0px' : '';
            chatAdRow.style.minHeight = hasChatAd ? '100px' : '';
        }

        if (chatEl) {
            chatEl.style.height = '100%';
        }
        if (adEl) {
            adEl.style.height = '100%';
        }

        if (queueEl) {
            queueEl.style.flex = hasQueue ? `${qPercent} 1 0px` : '';
            queueEl.style.height = hasQueue ? '0px' : '';
            queueEl.style.minHeight = hasQueue ? '100px' : '';
        }

        // 5. Vertical ordering
        const order = config.order || ['chat_ad', 'facecam', 'queue'];

        if (chatAdRow) chatAdRow.style.order = order.indexOf('chat_ad') + 1;
        if (facecamEl) facecamEl.style.order = order.indexOf('facecam') + 1;
        if (queueEl) queueEl.style.order = order.indexOf('queue') + 1;
    }

    return { apply };
})();
