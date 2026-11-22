/**
 * design.js - Design tab: theme swatches, font selector, and default persistence
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Design = (() => {
    'use strict';

    const t = (key, params) => ClipQ.I18n.t(key, params);
    const CUSTOM_DEFAULTS_KEY = 'clipq_custom_defaults';

    const COLOR_GROUPS = [
        {
            labelKey: 'design.group.backgrounds',
            items: [
                { var: '--color-bg', labelKey: 'design.color.app' },
                { var: '--color-menubar', labelKey: 'design.color.menubar' },
                { var: '--color-player-bg', labelKey: 'design.color.player' },
                { var: '--color-facecam-bg', labelKey: 'design.color.facecam' },
                { var: '--color-chat-bg', labelKey: 'design.color.chat' },
                { var: '--color-queue-bg', labelKey: 'design.color.queue' },
                { var: '--color-queue-item', labelKey: 'design.color.tile' },
                { var: '--color-queue-item-hover', labelKey: 'design.color.tile_hover' },
                { var: '--color-info-bg', labelKey: 'design.color.infobar' },
                { var: '--color-ad-bg', labelKey: 'design.color.ad' },
                { var: '--color-settings-bg', labelKey: 'design.color.settings' },
            ]
        },
        {
            labelKey: 'design.group.borders',
            items: [
                { var: '--color-border', labelKey: 'design.color.standard' },
                { var: '--color-border-player', labelKey: 'design.color.player' },
                { var: '--color-border-facecam', labelKey: 'design.color.facecam' },
                { var: '--color-border-chat', labelKey: 'design.color.chat' },
                { var: '--color-border-queue', labelKey: 'design.color.queue' },
                { var: '--color-border-info', labelKey: 'design.color.info' },
            ]
        },
        {
            labelKey: 'design.group.accent',
            items: [
                { var: '--color-accent', labelKey: 'design.color.accent' },
                { var: '--color-accent-hover', labelKey: 'design.color.hover' },
                { var: '--color-accent-glow', labelKey: 'design.color.glow' },
                { var: '--color-accent-secondary', labelKey: 'design.color.secondary' },
                { var: '--color-accent-gradient', labelKey: 'design.color.gradient' },
            ]
        },
        {
            labelKey: 'design.group.status',
            items: [
                { var: '--color-open', labelKey: 'design.color.open' },
                { var: '--color-closed', labelKey: 'design.color.closed' },
                { var: '--color-danger', labelKey: 'design.color.danger' },
                { var: '--color-push-badge', labelKey: 'design.color.badge' },
            ]
        },
        {
            labelKey: 'design.group.text',
            items: [
                { var: '--color-text', labelKey: 'design.color.standard' },
                { var: '--color-text-dim', labelKey: 'design.color.dimmed' },
                { var: '--color-text-bright', labelKey: 'design.color.bright' },
                { var: '--color-text-accent', labelKey: 'design.color.accent' },
            ]
        },
        {
            labelKey: 'design.group.misc',
            items: [
                { var: '--color-overlay', labelKey: 'design.color.overlay' },
            ]
        }
    ];

    const DEFAULT_COLORS = {
        '--color-bg': 'rgba(28,31,38,1)',
        '--color-menubar': 'rgba(38,42,52,1)',
        '--color-player-bg': 'rgba(12,14,18,1)',
        '--color-facecam-bg': 'rgba(34,38,47,1)',
        '--color-chat-bg': 'rgba(34,38,47,1)',
        '--color-queue-bg': 'rgba(34,38,47,1)',
        '--color-queue-item': 'rgba(46,51,63,1)',
        '--color-queue-item-hover': 'rgba(58,64,79,1)',
        '--color-info-bg': 'rgba(36,40,50,1)',
        '--color-ad-bg': 'rgba(34,38,47,1)',
        '--color-settings-bg': 'rgba(38,42,52,1)',
        '--color-overlay': 'rgba(10,12,18,0.45)',
        '--color-border': 'rgba(68,74,90,1)',
        '--color-border-facecam': 'rgba(82,66,76,1)',
        '--color-border-chat': 'rgba(64,70,86,1)',
        '--color-border-queue': 'rgba(64,70,86,1)',
        '--color-border-player': 'rgba(82,66,76,1)',
        '--color-border-info': 'rgba(82,66,76,1)',
        '--color-accent': 'rgba(220,74,60,1)',
        '--color-accent-hover': 'rgba(238,94,80,1)',
        '--color-accent-glow': 'rgba(220,74,60,0.35)',
        '--color-accent-secondary': 'rgba(176,52,48,1)',
        '--color-accent-gradient': 'rgba(255,138,128,1)',
        '--color-open': 'rgba(52,211,132,1)',
        '--color-closed': 'rgba(239,83,80,1)',
        '--color-push-badge': 'rgba(243,156,56,1)',
        '--color-danger': 'rgba(235,77,75,1)',
        '--color-text': 'rgba(234,237,243,1)',
        '--color-text-dim': 'rgba(168,176,192,1)',
        '--color-text-bright': 'rgba(255,255,255,1)',
        '--color-text-accent': 'rgba(255,158,150,1)',
        '--color-chat-text': 'rgba(234,237,243,1)',
    };

    const FONTS = [
        { name: 'Inter', value: "'Inter', sans-serif" },
        { name: 'Roboto', value: "'Roboto', sans-serif" },
        { name: 'Open Sans', value: "'Open Sans', sans-serif" },
        { name: 'Montserrat', value: "'Montserrat', sans-serif" },
        { name: 'Lato', value: "'Lato', sans-serif" },
        { name: 'Poppins', value: "'Poppins', sans-serif" },
        { name: 'Outfit', value: "'Outfit', sans-serif" },
        { name: 'Nunito', value: "'Nunito', sans-serif" },
        { name: 'Raleway', value: "'Raleway', sans-serif" },
        { name: 'Source Sans 3', value: "'Source Sans 3', sans-serif" },
    ];

    let originalValues = {};
    let originalInlineValues = {};

    function getFontValue(fontName) {
        const font = FONTS.find(f => f.name === fontName);
        return font ? font.value : FONTS[0].value;
    }

    function applyFont(fontName) {
        document.documentElement.style.setProperty('--font-family', getFontValue(fontName));
    }

    function readCssColor(cssVar) {
        return (
            document.documentElement.style.getPropertyValue(cssVar).trim()
            || getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
            || DEFAULT_COLORS[cssVar]
            || '#000000'
        );
    }

    function applySwatchesFromMap(resolveColor) {
        document.querySelectorAll('#stab-design .color-swatch').forEach(swatch => {
            const cssVar = swatch.dataset.var;
            const color = resolveColor(cssVar);
            const chip = swatch.querySelector('.swatch-color');
            if (color && chip) chip.style.background = color;
        });
    }

    function closePicker() {
        if (ClipQ.ColorPicker) ClipQ.ColorPicker.close();
    }

    function renderSwatches() {
        const container = document.getElementById('design-colors-container');
        if (container) {
            container.innerHTML = COLOR_GROUPS.map(group => `
                <div class="design-group">
                    <div class="design-group-label" data-i18n="${group.labelKey}">${ClipQ.escapeHtml(t(group.labelKey))}</div>
                    <div class="design-swatches">
                        ${group.items.map(item => {
                            const label = t(item.labelKey);
                            const currentColor = readCssColor(item.var);
                            return `
                            <button type="button" class="color-swatch" data-var="${item.var}" title="${ClipQ.escapeHtml(label)}: ${item.var}">
                                <div class="swatch-color-wrap">
                                    <div class="swatch-checker"></div>
                                    <div class="swatch-color" style="background:${ClipQ.escapeHtml(currentColor)}"></div>
                                </div>
                                <span class="swatch-label" data-i18n="${item.labelKey}">${ClipQ.escapeHtml(label)}</span>
                            </button>`;
                        }).join('')}
                    </div>
                </div>
            `).join('');
        }

        document.querySelectorAll('#design-colors-container .color-swatch').forEach(bindColorSwatch);
    }

    function bindColorSwatch(swatch) {
        if (!swatch) return;
        swatch.addEventListener('click', (e) => {
            e.stopPropagation();
            const cssVar = swatch.dataset.var;
            ClipQ.ColorPicker.open({
                anchorEl: swatch,
                initialColor: readCssColor(cssVar),
                onChange: (colorStr) => {
                    document.documentElement.style.setProperty(cssVar, colorStr);
                    const chip = swatch.querySelector('.swatch-color');
                    if (chip) chip.style.background = colorStr;
                }
            });
        });
    }

    function initChatControls() {
        bindColorSwatch(document.getElementById('design-chat-color-swatch'));
        const readChatTypo = () => ({
            chatFontFamily: document.getElementById('design-chat-font')?.value || 'Inter',
            chatFontSize: ClipQ.intOrDefault(document.getElementById('design-chat-font-size')?.value, 13)
        });
        document.getElementById('design-chat-font')?.addEventListener('change', () => {
            if (ClipQ.ChatFeed) ClipQ.ChatFeed.setPreviewOption('fontFamily', readChatTypo());
        });
        const sizeSlider = document.getElementById('design-chat-font-size');
        const sizeVal = document.getElementById('design-chat-font-size-val');
        if (sizeSlider) {
            sizeSlider.addEventListener('input', () => {
                if (sizeVal) sizeVal.textContent = `${sizeSlider.value}px`;
                if (ClipQ.ChatFeed) ClipQ.ChatFeed.setPreviewOption('fontSize', readChatTypo());
            });
        }
        document.getElementById('design-chat-animation')?.addEventListener('change', (e) => {
            if (ClipQ.ChatFeed) ClipQ.ChatFeed.setPreviewOption('animation', e.target.value);
        });
        document.getElementById('design-chat-direction')?.addEventListener('change', (e) => {
            if (ClipQ.ChatFeed) ClipQ.ChatFeed.setPreviewOption('direction', e.target.value);
        });
    }

    function populateFontSelect(selectEl) {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        FONTS.forEach(font => {
            const opt = document.createElement('option');
            opt.value = font.name;
            opt.textContent = font.name;
            selectEl.appendChild(opt);
        });
    }

    function init() {
        populateFontSelect(document.getElementById('design-font-select'));
        populateFontSelect(document.getElementById('design-chat-font'));
        renderSwatches();
        initChatControls();

        const fontSelect = document.getElementById('design-font-select');
        if (fontSelect) {
            fontSelect.addEventListener('change', () => applyFont(fontSelect.value));
        }

        const setDefaultBtn = document.getElementById('design-set-default-btn');
        if (setDefaultBtn) {
            setDefaultBtn.addEventListener('click', () => {
                if (!confirm(t('design.confirm_set_default'))) return;
                try {
                    localStorage.setItem(CUSTOM_DEFAULTS_KEY, JSON.stringify(readValues()));
                } catch { /* ignore storage quota errors */ }
                if (ClipQ.Sync) ClipQ.Sync.scheduleConfigSave();
                alert(t('design.alert_set_default'));
            });
        }

        const resetBtn = document.getElementById('design-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                let hasCustom = false;
                try {
                    hasCustom = !!localStorage.getItem(CUSTOM_DEFAULTS_KEY);
                } catch { /* ignore storage read errors */ }

                if (hasCustom) {
                    if (confirm(t('design.confirm_reset_custom'))) {
                        resetToDefaults(true);
                    } else if (confirm(t('design.confirm_reset_factory'))) {
                        try {
                            localStorage.removeItem(CUSTOM_DEFAULTS_KEY);
                        } catch { /* ignore storage remove errors */ }
                        if (ClipQ.Sync) ClipQ.Sync.scheduleConfigSave();
                        resetToDefaults(false);
                    }
                } else if (confirm(t('design.confirm_reset_all'))) {
                    resetToDefaults(false);
                }
            });
        }
    }

    function populate(designSettings) {
        if (!designSettings) return;
        const colors = designSettings.colors || {};
        applySwatchesFromMap((cssVar) => colors[cssVar] || readCssColor(cssVar));
        const fontSelect = document.getElementById('design-font-select');
        if (fontSelect) fontSelect.value = designSettings.fontFamily || 'Inter';

        const chatFont = document.getElementById('design-chat-font');
        if (chatFont) chatFont.value = designSettings.chatFontFamily || 'Inter';
        const chatSizeVal = Math.max(11, Math.min(26, ClipQ.intOrDefault(designSettings.chatFontSize, 13)));
        const chatSize = document.getElementById('design-chat-font-size');
        const chatSizeLabel = document.getElementById('design-chat-font-size-val');
        if (chatSize) chatSize.value = chatSizeVal;
        if (chatSizeLabel) chatSizeLabel.textContent = `${chatSizeVal}px`;
        const chatAnim = document.getElementById('design-chat-animation');
        if (chatAnim) chatAnim.value = designSettings.chatAnimation === 'none' ? 'none' : 'slide';
        const chatDir = document.getElementById('design-chat-direction');
        if (chatDir) chatDir.value = designSettings.chatDirection === 'top' ? 'top' : 'bottom';
        document.getElementById('design-chat-options')?.classList.toggle('hidden', designSettings.showChat === false);
    }

    function readValues() {
        const colors = {};
        Object.keys(DEFAULT_COLORS).forEach(cssVar => {
            const val = document.documentElement.style.getPropertyValue(cssVar).trim();
            if (val) colors[cssVar] = val;
        });
        const fontSelect = document.getElementById('design-font-select');
        const chatFont = document.getElementById('design-chat-font');
        const chatSize = document.getElementById('design-chat-font-size');
        const chatAnim = document.getElementById('design-chat-animation');
        const chatDir = document.getElementById('design-chat-direction');
        return {
            colors,
            fontFamily: fontSelect ? fontSelect.value : 'Inter',
            chatFontFamily: chatFont ? chatFont.value : 'Inter',
            chatFontSize: Math.max(11, Math.min(26, ClipQ.intOrDefault(chatSize?.value, 13))),
            chatAnimation: chatAnim?.value === 'none' ? 'none' : 'slide',
            chatDirection: chatDir?.value === 'top' ? 'top' : 'bottom'
        };
    }

    function saveOriginalValues() {
        originalValues = {};
        originalInlineValues = {};
        Object.keys(DEFAULT_COLORS).forEach(cssVar => {
            const inlineVal = document.documentElement.style.getPropertyValue(cssVar).trim();
            originalInlineValues[cssVar] = inlineVal;
            originalValues[cssVar] = inlineVal ||
                getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() ||
                DEFAULT_COLORS[cssVar];
        });
        const inlineFont = document.documentElement.style.getPropertyValue('--font-family').trim();
        originalInlineValues['--font-family'] = inlineFont;
        originalValues['--font-family'] = inlineFont ||
            getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();
    }

    function revertToOriginal() {
        closePicker();
        Object.entries(originalInlineValues).forEach(([varName, value]) => {
            if (value) document.documentElement.style.setProperty(varName, value);
            else document.documentElement.style.removeProperty(varName);
        });
        applySwatchesFromMap((cssVar) => originalValues[cssVar] || DEFAULT_COLORS[cssVar]);
        const fontSelect = document.getElementById('design-font-select');
        if (fontSelect && originalValues['--font-family']) {
            const match = FONTS.find(f => originalValues['--font-family'].includes(f.name));
            fontSelect.value = match ? match.name : 'Inter';
        }
    }

    function applyAll(designSettings) {
        if (!designSettings) return;
        const colors = designSettings.colors || {};
        Object.keys(DEFAULT_COLORS).forEach(varName => {
            if (colors[varName]) document.documentElement.style.setProperty(varName, colors[varName]);
            else document.documentElement.style.removeProperty(varName);
        });
        if (designSettings.fontFamily && designSettings.fontFamily !== 'Inter') {
            applyFont(designSettings.fontFamily);
        } else {
            document.documentElement.style.removeProperty('--font-family');
        }
    }

    function getCustomDefaults() {
        try {
            const custom = JSON.parse(localStorage.getItem(CUSTOM_DEFAULTS_KEY));
            if (custom && typeof custom === 'object') {
                return {
                    colors: custom.colors && typeof custom.colors === 'object' ? custom.colors : {},
                    fontFamily: custom.fontFamily || 'Inter',
                    chatFontFamily: custom.chatFontFamily || 'Inter',
                    chatFontSize: Math.max(11, Math.min(26, ClipQ.intOrDefault(custom.chatFontSize, 13))),
                    chatAnimation: custom.chatAnimation === 'none' ? 'none' : 'slide',
                    chatDirection: custom.chatDirection === 'top' ? 'top' : 'bottom'
                };
            }
        } catch { /* ignore corrupt custom defaults */ }
        return null;
    }

    function resetToDefaults(useCustom) {
        closePicker();
        let nextDesign = {
            colors: {},
            fontFamily: 'Inter',
            chatFontFamily: 'Inter',
            chatFontSize: 13,
            chatAnimation: 'slide',
            chatDirection: 'bottom'
        };
        if (useCustom !== false) {
            const custom = getCustomDefaults();
            if (custom) nextDesign = custom;
        }

        applyAll(nextDesign);
        populate(nextDesign);
        if (ClipQ.ChatFeed) ClipQ.ChatFeed.applySettings({ ...ClipQ.Settings?.get()?.design, ...nextDesign });
    }

    return {
        init,
        populate,
        readValues,
        saveOriginalValues,
        revertToOriginal,
        applyAll,
        getFontValue,
        closePicker,
        renderSwatches
    };
})();
