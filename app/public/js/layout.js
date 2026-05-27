/**
 * layout.js — Layout rendering and positioning engine
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Layout = (() => {
    function apply(config) {
        console.log('[Layout] apply called with config:', config);
        if (!config) return;

        const mainLayout = document.querySelector('.main-layout');
        console.log('[Layout] mainLayout element found:', mainLayout);
        if (!mainLayout) return;

        // 1. Infobar and Sidebar Grid layout
        const w = config.playerWidth || 70;
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

        // 2. Sidebar component visibility
        const hasFacecam = config.showFacecam !== false;
        const hasChat = config.showChat !== false;
        const hasAd = config.showAd !== false;
        const hasQueue = config.showQueue !== false;
        const hasChatAd = hasChat || hasAd;

        const facecamEl = document.getElementById('facecam-area');
        const chatEl = document.getElementById('chat-area');
        const adEl = document.getElementById('ad-area');
        const chatAdRow = document.querySelector('.sidebar-chat-ad-row');
        const queueEl = document.getElementById('queue-section');

        if (facecamEl) facecamEl.style.display = hasFacecam ? 'block' : 'none';
        if (chatAdRow) chatAdRow.style.display = hasChatAd ? 'flex' : 'none';
        if (chatEl) chatEl.style.display = hasChat ? 'block' : 'none';
        if (queueEl) queueEl.style.display = hasQueue ? 'flex' : 'none';
        if (adEl) {
            adEl.style.display = hasAd ? 'block' : 'none';
            if (!hasChat && hasAd) {
                adEl.style.width = '100%';
            } else {
                adEl.style.width = '';
            }
        }

        // 3. Heights
        let facecamHeight = '420px';
        let chatAdHeight = '230px';

        if (hasFacecam && !hasChatAd) {
            facecamHeight = '658px'; // 420 + 230 + 8px gap
        } else if (!hasFacecam && hasChatAd) {
            chatAdHeight = '658px'; // 420 + 230 + 8px gap
        }

        if (facecamEl) facecamEl.style.height = facecamHeight;
        if (chatEl) chatEl.style.height = chatAdHeight;
        if (adEl) adEl.style.height = chatAdHeight;

        // 4. Vertical ordering
        const order = config.order || ['chat_ad', 'facecam', 'queue'];

        if (chatAdRow) chatAdRow.style.order = order.indexOf('chat_ad') + 1;
        if (facecamEl) facecamEl.style.order = order.indexOf('facecam') + 1;
        if (queueEl) queueEl.style.order = order.indexOf('queue') + 1;
    }

    return { apply };
})();
