/**
 * settings-layout.js - Layout tab controls, height balancer, and component ordering UI
 */
window.ClipQ = window.ClipQ || {};

ClipQ.SettingsLayout = (() => {
    'use strict';

    const CUSTOM_LAYOUT_KEY = 'clipq_layout_custom_defaults';
    const LAYOUT_FIELDS = [
        ['facecam', 'Facecam'],
        ['chat', 'Chat'],
        ['ad', 'Ad'],
        ['queue', 'Queue']
    ];

    const DEFAULT_LAYOUT = {
        infoPosition: 'below',
        sidebarPosition: 'right',
        showFacecam: true,
        showChat: true,
        showAd: true,
        showQueue: true,
        hideFacecam: false,
        hideChat: false,
        hideAd: false,
        hideQueue: false,
        playerWidth: 70,
        chatWidth: 60,
        facecamHeightPercent: 40,
        chatAdHeightPercent: 25,
        queueHeightPercent: 35,
        lockFacecam: false,
        lockChatAd: false,
        lockQueue: false,
        order: ['chat_ad', 'facecam', 'queue']
    };

    let currentLayoutOrder = [...DEFAULT_LAYOUT.order];
    let currentHeightPercent = {
        facecam: DEFAULT_LAYOUT.facecamHeightPercent,
        queue: DEFAULT_LAYOUT.queueHeightPercent,
        chat_ad: DEFAULT_LAYOUT.chatAdHeightPercent
    };

    function getDefaultLayout() {
        return { ...DEFAULT_LAYOUT, order: [...DEFAULT_LAYOUT.order] };
    }

    function readFromUI() {
        const infoPosEl = document.getElementById('layout-info-position');
        const sidebarPosEl = document.getElementById('layout-sidebar-position');
        const playerWidthEl = document.getElementById('layout-player-width');
        const chatWidthEl = document.getElementById('layout-chat-width');
        const fcHeightEl = document.getElementById('layout-facecam-height');
        const qHeightEl = document.getElementById('layout-queue-height');
        const lockFcEl = document.getElementById('layout-lock-facecam');
        const lockCaEl = document.getElementById('layout-lock-chat-ad');
        const lockQEl = document.getElementById('layout-lock-queue');

        const fcVal = fcHeightEl ? ClipQ.intOrDefault(fcHeightEl.value, 40) : 40;
        const qVal = qHeightEl ? ClipQ.intOrDefault(qHeightEl.value, 35) : 35;

        return {
            infoPosition: infoPosEl ? infoPosEl.value : 'below',
            sidebarPosition: sidebarPosEl ? sidebarPosEl.value : 'right',
            playerWidth: playerWidthEl ? ClipQ.intOrDefault(playerWidthEl.value, 70) : 70,
            chatWidth: chatWidthEl ? ClipQ.intOrDefault(chatWidthEl.value, 60) : 60,
            facecamHeightPercent: fcVal,
            chatAdHeightPercent: 100 - fcVal - qVal,
            queueHeightPercent: qVal,
            lockFacecam: lockFcEl ? lockFcEl.checked : false,
            lockChatAd: lockCaEl ? lockCaEl.checked : false,
            lockQueue: lockQEl ? lockQEl.checked : false,
            showFacecam: !ClipQ.getToggleState('layout-remove-facecam'),
            showChat: !ClipQ.getToggleState('layout-remove-chat'),
            showAd: !ClipQ.getToggleState('layout-remove-ad'),
            showQueue: !ClipQ.getToggleState('layout-remove-queue'),
            hideFacecam: ClipQ.getToggleState('layout-hide-facecam'),
            hideChat: ClipQ.getToggleState('layout-hide-chat'),
            hideAd: ClipQ.getToggleState('layout-hide-ad'),
            hideQueue: ClipQ.getToggleState('layout-hide-queue'),
            order: [...currentLayoutOrder]
        };
    }

    function triggerLiveApply() {
        if (ClipQ.Layout) ClipQ.Layout.apply(readFromUI());
    }

    function updateSliderUI(key, value) {
        const slider = document.getElementById(`layout-${key}-height`);
        if (!slider) return;
        slider.value = value;
        const valEl = document.getElementById(`layout-${key}-height-val`);
        if (valEl) valEl.textContent = `${value}%`;
    }

    function renderOrderingUI() {
        const listContainer = document.getElementById('layout-ordering-list');
        if (!listContainer) return;

        const t = ClipQ.I18n.t.bind(ClipQ.I18n);
        const showFacecam = !ClipQ.getToggleState('layout-remove-facecam');
        const showChat = !ClipQ.getToggleState('layout-remove-chat');
        const showAd = !ClipQ.getToggleState('layout-remove-ad');
        const showQueue = !ClipQ.getToggleState('layout-remove-queue');
        const showChatAd = showChat || showAd;

        const activeComponents = currentLayoutOrder.filter(item => {
            if (item === 'facecam') return showFacecam;
            if (item === 'chat_ad') return showChatAd;
            if (item === 'queue') return showQueue;
            return false;
        });

        const orderingGroup = document.getElementById('layout-ordering-group');
        if (activeComponents.length <= 1) {
            if (orderingGroup) orderingGroup.style.display = 'none';
            listContainer.innerHTML = '';
            return;
        }
        if (orderingGroup) orderingGroup.style.display = '';

        listContainer.innerHTML = '';
        const labels = {
            facecam: t('settings.layout.block_facecam') || 'Facecam',
            chat_ad: t('settings.layout.block_chat_ad') || 'Chat + Ad',
            queue: t('settings.layout.block_queue') || 'Queue'
        };
        const positions = [
            { label: t('settings.layout.pos_top') || 'Top', index: 0 },
            { label: t('settings.layout.pos_middle') || 'Middle', index: 1 },
            { label: t('settings.layout.pos_bottom') || 'Bottom', index: 2 }
        ];
        const allowedPositions = activeComponents.length === 3
            ? positions
            : [positions[0], positions[2]];

        activeComponents.forEach((comp, idx) => {
            const row = document.createElement('div');
            row.className = 'layout-order-row';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'layout-order-label';
            labelSpan.textContent = labels[comp];
            row.appendChild(labelSpan);

            const btnGroup = document.createElement('div');
            btnGroup.className = 'layout-order-buttons';

            allowedPositions.forEach((pos, posIdx) => {
                const isActive = idx === posIdx;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `btn layout-order-btn ${isActive ? 'btn-primary' : 'btn-ghost'}`;
                btn.textContent = pos.label;
                btn.setAttribute('aria-pressed', String(isActive));

                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (isActive) return;

                    const moved = activeComponents.splice(idx, 1)[0];
                    activeComponents.splice(posIdx, 0, moved);

                    const inactive = ['facecam', 'chat_ad', 'queue'].filter(c => !activeComponents.includes(c));
                    currentLayoutOrder = [...activeComponents, ...inactive];

                    renderOrderingUI();
                    triggerLiveApply();
                });

                btnGroup.appendChild(btn);
            });

            row.appendChild(btnGroup);
            listContainer.appendChild(row);
        });
    }

    function applyToUI(layout) {
        currentHeightPercent.facecam = ClipQ.intOrDefault(layout.facecamHeightPercent, 40);
        currentHeightPercent.queue = ClipQ.intOrDefault(layout.queueHeightPercent, 35);
        currentHeightPercent.chat_ad = ClipQ.intOrDefault(
            layout.chatAdHeightPercent,
            100 - currentHeightPercent.facecam - currentHeightPercent.queue
        );

        document.getElementById('layout-info-position').value = layout.infoPosition || 'below';
        document.getElementById('layout-sidebar-position').value = layout.sidebarPosition || 'right';

        const playerWidth = ClipQ.intOrDefault(layout.playerWidth, 70);
        document.getElementById('layout-player-width').value = playerWidth;
        const widthValEl = document.getElementById('layout-player-width-val');
        if (widthValEl) widthValEl.textContent = `${playerWidth}%`;

        const chatWidth = ClipQ.intOrDefault(layout.chatWidth, 60);
        const chatWidthInput = document.getElementById('layout-chat-width');
        if (chatWidthInput) chatWidthInput.value = chatWidth;
        const chatWidthValEl = document.getElementById('layout-chat-width-val');
        if (chatWidthValEl) chatWidthValEl.textContent = `${chatWidth}%`;

        updateSliderUI('facecam', currentHeightPercent.facecam);
        updateSliderUI('queue', currentHeightPercent.queue);

        const lockFcEl = document.getElementById('layout-lock-facecam');
        if (lockFcEl) {
            lockFcEl.checked = !!layout.lockFacecam;
            const slider = document.getElementById('layout-facecam-height');
            if (slider) slider.disabled = lockFcEl.checked;
        }
        const lockCaEl = document.getElementById('layout-lock-chat-ad');
        if (lockCaEl) lockCaEl.checked = !!layout.lockChatAd;
        const lockQEl = document.getElementById('layout-lock-queue');
        if (lockQEl) {
            lockQEl.checked = !!layout.lockQueue;
            const slider = document.getElementById('layout-queue-height');
            if (slider) slider.disabled = lockQEl.checked;
        }

        LAYOUT_FIELDS.forEach(([type, suffix]) => {
            const removed = layout[`show${suffix}`] === false;
            const hidden = !removed && !!layout[`hide${suffix}`];
            ClipQ.setToggleState(`layout-hide-${type}`, hidden);
            ClipQ.setToggleState(`layout-remove-${type}`, removed);
        });

        currentLayoutOrder = Array.isArray(layout.order) ? [...layout.order] : [...DEFAULT_LAYOUT.order];
        renderOrderingUI();
    }

    function distributeChange(changedKey, newValue) {
        const locks = {
            facecam: document.getElementById('layout-lock-facecam')?.checked || false,
            chat_ad: document.getElementById('layout-lock-chat-ad')?.checked || false,
            queue: document.getElementById('layout-lock-queue')?.checked || false
        };
        const active = {
            facecam: !ClipQ.getToggleState('layout-remove-facecam'),
            chat_ad: !ClipQ.getToggleState('layout-remove-chat') || !ClipQ.getToggleState('layout-remove-ad'),
            queue: !ClipQ.getToggleState('layout-remove-queue')
        };

        const currentValues = {
            facecam: currentHeightPercent.facecam,
            chat_ad: currentHeightPercent.chat_ad,
            queue: currentHeightPercent.queue
        };

        const oldValue = currentValues[changedKey];
        const delta = newValue - oldValue;
        if (delta === 0) return;

        const receiverKeys = Object.keys(active).filter(k => k !== changedKey && active[k] && !locks[k]);
        if (receiverKeys.length === 0) {
            updateSliderUI(changedKey, oldValue);
            return;
        }

        let remainingDelta = delta;
        const newValues = { ...currentValues, [changedKey]: newValue };
        let attempts = 0;
        let pool = [...receiverKeys];

        while (Math.abs(remainingDelta) > 0.01 && pool.length > 0 && attempts < 5) {
            attempts++;
            const share = remainingDelta / pool.length;
            const nextPool = [];

            for (const rKey of pool) {
                const val = newValues[rKey] - share;
                if (val < 10) {
                    remainingDelta -= (newValues[rKey] - 10);
                    newValues[rKey] = 10;
                } else if (val > 80) {
                    remainingDelta -= (newValues[rKey] - 80);
                    newValues[rKey] = 80;
                } else {
                    newValues[rKey] = val;
                    remainingDelta -= share;
                    nextPool.push(rKey);
                }
            }
            pool = nextPool;
        }

        if (Math.abs(remainingDelta) > 0.01) {
            newValues[changedKey] -= remainingDelta;
        }

        const rounded = {
            facecam: Math.round(newValues.facecam),
            chat_ad: Math.round(newValues.chat_ad),
            queue: Math.round(newValues.queue)
        };
        const roundedSum = rounded.facecam + rounded.chat_ad + rounded.queue;
        if (roundedSum !== 100) {
            const diff = 100 - roundedSum;
            const adjustKey = receiverKeys.find(k => rounded[k] + diff >= 10 && rounded[k] + diff <= 80) || changedKey;
            rounded[adjustKey] += diff;
        }

        currentHeightPercent = { ...rounded };
        updateSliderUI('facecam', currentHeightPercent.facecam);
        updateSliderUI('queue', currentHeightPercent.queue);
        triggerLiveApply();
    }

    function readCustomLayout() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CUSTOM_LAYOUT_KEY));
            return (parsed && typeof parsed === 'object') ? parsed : null;
        } catch {
            return null;
        }
    }

    function initListeners() {
        const infoPosSelect = document.getElementById('layout-info-position');
        if (infoPosSelect) infoPosSelect.addEventListener('change', triggerLiveApply);

        const sidebarPosSelect = document.getElementById('layout-sidebar-position');
        if (sidebarPosSelect) sidebarPosSelect.addEventListener('change', triggerLiveApply);

        const playerWidthInput = document.getElementById('layout-player-width');
        if (playerWidthInput) {
            playerWidthInput.addEventListener('input', () => {
                const valEl = document.getElementById('layout-player-width-val');
                if (valEl) valEl.textContent = `${playerWidthInput.value}%`;
                triggerLiveApply();
            });
        }

        const chatWidthInput = document.getElementById('layout-chat-width');
        if (chatWidthInput) {
            chatWidthInput.addEventListener('input', () => {
                const valEl = document.getElementById('layout-chat-width-val');
                if (valEl) valEl.textContent = `${chatWidthInput.value}%`;
                triggerLiveApply();
            });
        }

        const bindVisibilityToggle = (toggleId, pairedId) => {
            const toggle = document.getElementById(toggleId);
            if (!toggle) return;
            toggle.addEventListener('click', () => {
                const nextActive = !ClipQ.getToggleState(toggleId);
                ClipQ.setToggleState(toggleId, nextActive);
                if (nextActive) ClipQ.setToggleState(pairedId, false);
                renderOrderingUI();
                triggerLiveApply();
            });
        };
        LAYOUT_FIELDS.forEach(([type]) => {
            bindVisibilityToggle(`layout-hide-${type}`, `layout-remove-${type}`);
            bindVisibilityToggle(`layout-remove-${type}`, `layout-hide-${type}`);
        });

        const facecamHeightInput = document.getElementById('layout-facecam-height');
        if (facecamHeightInput) {
            facecamHeightInput.addEventListener('input', () => {
                distributeChange('facecam', ClipQ.intOrDefault(facecamHeightInput.value, currentHeightPercent.facecam));
            });
        }

        const queueHeightInput = document.getElementById('layout-queue-height');
        if (queueHeightInput) {
            queueHeightInput.addEventListener('input', () => {
                distributeChange('queue', ClipQ.intOrDefault(queueHeightInput.value, currentHeightPercent.queue));
            });
        }

        ['lock-facecam', 'lock-chat-ad', 'lock-queue'].forEach(id => {
            const el = document.getElementById(`layout-${id}`);
            if (!el) return;
            el.addEventListener('change', () => {
                if (id === 'lock-facecam') {
                    const slider = document.getElementById('layout-facecam-height');
                    if (slider) slider.disabled = el.checked;
                } else if (id === 'lock-queue') {
                    const slider = document.getElementById('layout-queue-height');
                    if (slider) slider.disabled = el.checked;
                }
                triggerLiveApply();
            });
        });

        const layoutSetDefaultBtn = document.getElementById('layout-set-default-btn');
        if (layoutSetDefaultBtn) {
            layoutSetDefaultBtn.addEventListener('click', () => {
                if (!confirm(ClipQ.I18n.t('settings.layout.confirm_set_default'))) return;
                try {
                    localStorage.setItem(CUSTOM_LAYOUT_KEY, JSON.stringify(readFromUI()));
                } catch { /* ignore storage quota errors */ }
                alert(ClipQ.I18n.t('settings.layout.alert_set_default'));
            });
        }

        const layoutResetBtn = document.getElementById('layout-reset-btn');
        if (layoutResetBtn) {
            layoutResetBtn.addEventListener('click', () => {
                const customLayout = readCustomLayout();
                let targetLayout = null;

                if (customLayout) {
                    if (confirm(ClipQ.I18n.t('settings.layout.confirm_reset_custom'))) {
                        targetLayout = customLayout;
                    } else if (confirm(ClipQ.I18n.t('settings.layout.confirm_reset_factory'))) {
                        try {
                            localStorage.removeItem(CUSTOM_LAYOUT_KEY);
                        } catch { /* ignore storage errors */ }
                        targetLayout = getDefaultLayout();
                    }
                } else if (confirm(ClipQ.I18n.t('settings.layout.confirm_reset_all'))) {
                    targetLayout = getDefaultLayout();
                }

                if (targetLayout) {
                    applyToUI(targetLayout);
                    triggerLiveApply();
                }
            });
        }
    }

    return {
        getDefaultLayout,
        readFromUI,
        applyToUI,
        renderOrderingUI,
        initListeners
    };
})();
