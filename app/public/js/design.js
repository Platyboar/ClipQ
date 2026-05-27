/**
 * design.js — Design tab: live color picker with color wheel + font selector
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Design = (() => {
    const t = (key, params) => ClipQ.I18n.t(key, params);
    // ─── Configuration ───────────────────────────────────

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
                { var: '--color-accent-glow', labelKey: 'design.color.glow', hasAlpha: true },
                { var: '--color-accent-secondary', labelKey: 'design.color.secondary' },
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
                { var: '--color-overlay', labelKey: 'design.color.overlay', hasAlpha: true },
            ]
        }
    ];

    const DEFAULT_COLORS = {
        '--color-bg': '#0d0d0d',
        '--color-menubar': '#161616',
        '--color-player-bg': '#000000',
        '--color-facecam-bg': '#101010',
        '--color-chat-bg': '#101010',
        '--color-queue-bg': '#101010',
        '--color-queue-item': '#1a1a1a',
        '--color-queue-item-hover': '#222222',
        '--color-info-bg': '#101010',
        '--color-ad-bg': '#101010',
        '--color-settings-bg': '#141414',
        '--color-overlay': 'rgba(0,0,0,0.7)',
        '--color-border': '#222222',
        '--color-border-facecam': '#2a1a1a',
        '--color-border-chat': '#1e1e1e',
        '--color-border-queue': '#1c1c1c',
        '--color-border-player': '#2a1a1a',
        '--color-border-info': '#2a1a1a',
        '--color-accent': '#c0392b',
        '--color-accent-hover': '#e04030',
        '--color-accent-glow': 'rgba(192,57,43,0.3)',
        '--color-accent-secondary': '#8e1a1a',
        '--color-open': '#2ecc71',
        '--color-closed': '#e74c3c',
        '--color-push-badge': '#e67e22',
        '--color-danger': '#e74c3c',
        '--color-text': '#cccccc',
        '--color-text-dim': '#666666',
        '--color-text-bright': '#ffffff',
        '--color-text-accent': '#e88080',
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

    // ─── State ────────────────────────────────────────────

    let pickerPopup = null;
    let activeSwatch = null;
    let activeVar = null;
    let activeHasAlpha = false;
    let currentHSV = { h: 0, s: 0, v: 0 };
    let currentAlpha = 1;
    let dragging = null; // 'ring' | 'square' | null
    let originalValues = {};

    // Canvas config
    const CANVAS_SIZE = 220;
    const RING_OUTER = 105;
    const RING_INNER = 78;
    const SQ_SIZE = 100;
    const SQ_OFFSET = (CANVAS_SIZE - SQ_SIZE) / 2;

    // ─── Color Conversion ─────────────────────────────────

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length !== 6) return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(hex.substring(0, 2), 16) || 0,
            g: parseInt(hex.substring(2, 4), 16) || 0,
            b: parseInt(hex.substring(4, 6), 16) || 0
        };
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(c =>
            Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')
        ).join('');
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0, s = max === 0 ? 0 : d / max, v = max;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else h = ((r - g) / d + 4) / 6;
        }
        return { h: h * 360, s, v };
    }

    function hsvToRgb(h, s, v) {
        h = ((h % 360) + 360) % 360;
        const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
        let r, g, b;
        if (h < 60)       { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else               { r = c; g = 0; b = x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function parseColor(str) {
        str = (str || '').trim();
        // Handle rgb() and rgba() — both comma and space-separated
        const m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/);
        if (m) {
            return {
                r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]),
                a: m[4] !== undefined ? parseFloat(m[4]) : 1
            };
        }
        const rgb = hexToRgb(str);
        return { ...rgb, a: 1 };
    }

    function formatColor(r, g, b, a) {
        r = Math.round(r); g = Math.round(g); b = Math.round(b);
        if (a !== undefined && a < 1) {
            return `rgba(${r},${g},${b},${parseFloat(a.toFixed(2))})`;
        }
        return rgbToHex(r, g, b);
    }

    // ─── Canvas Drawing ───────────────────────────────────

    function drawPicker(canvas) {
        const ctx = canvas.getContext('2d');
        const cx = CANVAS_SIZE / 2, cy = CANVAS_SIZE / 2;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Hue Ring — draw 360 arc segments
        for (let deg = 0; deg < 360; deg++) {
            const rad0 = (deg - 0.5) * Math.PI / 180;
            const rad1 = (deg + 1.5) * Math.PI / 180;
            ctx.beginPath();
            ctx.arc(cx, cy, RING_OUTER, rad0, rad1);
            ctx.arc(cx, cy, RING_INNER, rad1, rad0, true);
            ctx.closePath();
            ctx.fillStyle = `hsl(${deg}, 100%, 50%)`;
            ctx.fill();
        }

        // SV Square — saturation (x-axis), value/brightness (y-axis)
        const pureRgb = hsvToRgb(currentHSV.h, 1, 1);
        ctx.fillStyle = `rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b})`;
        ctx.fillRect(SQ_OFFSET, SQ_OFFSET, SQ_SIZE, SQ_SIZE);

        const whiteGrad = ctx.createLinearGradient(SQ_OFFSET, 0, SQ_OFFSET + SQ_SIZE, 0);
        whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
        whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = whiteGrad;
        ctx.fillRect(SQ_OFFSET, SQ_OFFSET, SQ_SIZE, SQ_SIZE);

        const blackGrad = ctx.createLinearGradient(0, SQ_OFFSET, 0, SQ_OFFSET + SQ_SIZE);
        blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
        blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = blackGrad;
        ctx.fillRect(SQ_OFFSET, SQ_OFFSET, SQ_SIZE, SQ_SIZE);

        // Hue indicator on ring
        const hueRad = currentHSV.h * Math.PI / 180;
        const ringMid = (RING_INNER + RING_OUTER) / 2;
        const hx = cx + Math.cos(hueRad) * ringMid;
        const hy = cy + Math.sin(hueRad) * ringMid;
        ctx.beginPath();
        ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hx, hy, 9.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // SV indicator in square
        const svx = SQ_OFFSET + currentHSV.s * SQ_SIZE;
        const svy = SQ_OFFSET + (1 - currentHSV.v) * SQ_SIZE;
        ctx.beginPath();
        ctx.arc(svx, svy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(svx, svy, 7.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function getCanvasZone(x, y) {
        const cx = CANVAS_SIZE / 2, cy = CANVAS_SIZE / 2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist >= RING_INNER && dist <= RING_OUTER + 4) return 'ring';
        if (x >= SQ_OFFSET && x <= SQ_OFFSET + SQ_SIZE &&
            y >= SQ_OFFSET && y <= SQ_OFFSET + SQ_SIZE) return 'square';
        return null;
    }

    function handleCanvasInput(canvas, x, y, zone) {
        const cx = CANVAS_SIZE / 2, cy = CANVAS_SIZE / 2;
        if (zone === 'ring') {
            const angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
            currentHSV.h = ((angle % 360) + 360) % 360;
        } else if (zone === 'square') {
            currentHSV.s = Math.max(0, Math.min(1, (x - SQ_OFFSET) / SQ_SIZE));
            currentHSV.v = Math.max(0, Math.min(1, 1 - (y - SQ_OFFSET) / SQ_SIZE));
        }
        drawPicker(canvas);
        syncFromHSV();
    }

    // ─── Sync Functions ───────────────────────────────────

    function syncFromHSV() {
        const rgb = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        if (pickerPopup) {
            pickerPopup.querySelector('.cp-hex').value = hex;
            pickerPopup.querySelector('.cp-r').value = rgb.r;
            pickerPopup.querySelector('.cp-g').value = rgb.g;
            pickerPopup.querySelector('.cp-b').value = rgb.b;
            updatePreview(rgb);
            updateAlphaTrack(rgb);
        }
        applyCurrentColor();
    }

    function syncFromRGB() {
        if (!pickerPopup) return;
        const r = clamp(parseInt(pickerPopup.querySelector('.cp-r').value) || 0, 0, 255);
        const g = clamp(parseInt(pickerPopup.querySelector('.cp-g').value) || 0, 0, 255);
        const b = clamp(parseInt(pickerPopup.querySelector('.cp-b').value) || 0, 0, 255);
        currentHSV = rgbToHsv(r, g, b);
        pickerPopup.querySelector('.cp-hex').value = rgbToHex(r, g, b);
        updatePreview({ r, g, b });
        updateAlphaTrack({ r, g, b });
        drawPicker(pickerPopup.querySelector('.cp-canvas'));
        applyCurrentColor();
    }

    function syncFromHex() {
        if (!pickerPopup) return;
        let hex = pickerPopup.querySelector('.cp-hex').value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9a-fA-F]{3}$/.test(hex) && !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
        const rgb = hexToRgb(hex);
        currentHSV = rgbToHsv(rgb.r, rgb.g, rgb.b);
        pickerPopup.querySelector('.cp-r').value = rgb.r;
        pickerPopup.querySelector('.cp-g').value = rgb.g;
        pickerPopup.querySelector('.cp-b').value = rgb.b;
        updatePreview(rgb);
        updateAlphaTrack(rgb);
        drawPicker(pickerPopup.querySelector('.cp-canvas'));
        applyCurrentColor();
    }

    function syncFromAlpha() {
        if (!pickerPopup) return;
        currentAlpha = parseFloat(pickerPopup.querySelector('.cp-alpha').value);
        pickerPopup.querySelector('.cp-alpha-val').textContent = Math.round(currentAlpha * 100) + '%';
        const rgb = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
        updatePreview(rgb);
        applyCurrentColor();
    }

    function updatePreview(rgb) {
        if (!pickerPopup) return;
        const el = pickerPopup.querySelector('.cp-preview');
        if (el) el.style.background = formatColor(rgb.r, rgb.g, rgb.b, currentAlpha);
    }

    function updateAlphaTrack(rgb) {
        if (!pickerPopup || !activeHasAlpha) return;
        const track = pickerPopup.querySelector('.cp-alpha');
        if (track) {
            track.style.background =
                `linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgb(${rgb.r},${rgb.g},${rgb.b})),` +
                `repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 50% / 8px 8px`;
            track.style.borderRadius = '4px';
        }
    }

    function applyCurrentColor() {
        const rgb = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
        const colorStr = formatColor(rgb.r, rgb.g, rgb.b, activeHasAlpha ? currentAlpha : 1);
        if (activeVar) {
            document.documentElement.style.setProperty(activeVar, colorStr);
        }
        if (activeSwatch) {
            activeSwatch.querySelector('.swatch-color').style.background = colorStr;
        }
    }

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

    // ─── Picker Popup ─────────────────────────────────────

    function openPicker(swatchEl, cssVar, hasAlpha) {
        closePicker();

        activeSwatch = swatchEl;
        activeVar = cssVar;
        activeHasAlpha = hasAlpha;
        swatchEl.classList.add('swatch-active');

        // Read current color from inline style or computed style
        const raw = document.documentElement.style.getPropertyValue(cssVar).trim() ||
                    getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() ||
                    DEFAULT_COLORS[cssVar] || '#000000';

        const parsed = parseColor(raw);
        currentHSV = rgbToHsv(parsed.r, parsed.g, parsed.b);
        currentAlpha = parsed.a;

        // Build popup
        const popup = document.createElement('div');
        popup.className = 'color-picker-popup';
        popup.innerHTML = `
            <canvas class="cp-canvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
            ${hasAlpha ? `
                <div class="cp-alpha-row">
                    <label>Opacity</label>
                    <input type="range" class="cp-alpha" min="0" max="1" step="0.01" value="${currentAlpha}">
                    <span class="cp-alpha-val">${Math.round(currentAlpha * 100)}%</span>
                </div>
            ` : ''}
            <div class="cp-inputs">
                <div class="cp-hex-group">
                    <label>HEX</label>
                    <input type="text" class="cp-hex" value="${rgbToHex(parsed.r, parsed.g, parsed.b)}" maxlength="7" spellcheck="false">
                </div>
                <div class="cp-rgb-group">
                    <div><label>R</label><input type="number" class="cp-r" min="0" max="255" value="${parsed.r}"></div>
                    <div><label>G</label><input type="number" class="cp-g" min="0" max="255" value="${parsed.g}"></div>
                    <div><label>B</label><input type="number" class="cp-b" min="0" max="255" value="${parsed.b}"></div>
                </div>
                <div class="cp-preview-wrap">
                    <div class="cp-preview-checker"></div>
                    <div class="cp-preview" style="background:${raw}"></div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        pickerPopup = popup;
        positionPopup(swatchEl, popup);

        // Initial draw
        const canvas = popup.querySelector('.cp-canvas');
        drawPicker(canvas);
        if (hasAlpha) updateAlphaTrack(parsed);

        // ─ Canvas events ─
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width);
            const y = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height);
            dragging = getCanvasZone(x, y);
            if (dragging) handleCanvasInput(canvas, x, y, dragging);
        });

        // ─ Input events ─
        popup.querySelector('.cp-hex').addEventListener('input', syncFromHex);
        popup.querySelector('.cp-r').addEventListener('input', syncFromRGB);
        popup.querySelector('.cp-g').addEventListener('input', syncFromRGB);
        popup.querySelector('.cp-b').addEventListener('input', syncFromRGB);
        if (hasAlpha) popup.querySelector('.cp-alpha').addEventListener('input', syncFromAlpha);

        // ─ Global drag events ─
        document.addEventListener('mousemove', onPickerDrag);
        document.addEventListener('mouseup', onPickerDragEnd);

        // ─ Close on scroll ─
        const modalBody = document.querySelector('#settings-overlay .modal-body');
        if (modalBody) modalBody.addEventListener('scroll', () => closePicker(), { once: true });

        // ─ Close on outside click (delayed to prevent instant close) ─
        setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 50);
    }

    function onPickerDrag(e) {
        if (!dragging || !pickerPopup) return;
        const canvas = pickerPopup.querySelector('.cp-canvas');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width);
        const y = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height);
        handleCanvasInput(canvas, x, y, dragging);
    }

    function onPickerDragEnd() { dragging = null; }

    function onOutsideClick(e) {
        if (pickerPopup && !pickerPopup.contains(e.target) && !e.target.closest('.color-swatch')) {
            closePicker();
        }
    }

    function closePicker() {
        if (activeSwatch) activeSwatch.classList.remove('swatch-active');
        if (pickerPopup) { pickerPopup.remove(); pickerPopup = null; }
        activeSwatch = null;
        activeVar = null;
        dragging = null;
        document.removeEventListener('mousemove', onPickerDrag);
        document.removeEventListener('mouseup', onPickerDragEnd);
        document.removeEventListener('mousedown', onOutsideClick);
    }

    function positionPopup(anchor, popup) {
        const rect = anchor.getBoundingClientRect();
        let left = rect.right + 12;
        let top = rect.top - 40;

        // Flip left if off-screen right
        if (left + 280 > window.innerWidth) left = rect.left - 280 - 12;
        // Clamp vertical
        if (top + 400 > window.innerHeight) top = window.innerHeight - 410;
        if (top < 10) top = 10;

        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }

    // ─── Font Handling ────────────────────────────────────

    function applyFont(fontName) {
        const font = FONTS.find(f => f.name === fontName);
        if (font) document.documentElement.style.setProperty('--font-family', font.value);
    }

    // ─── Public API ───────────────────────────────────────

    function init() {
        // Generate color swatches dynamically
        const container = document.getElementById('design-colors-container');
        if (container) {
            container.innerHTML = COLOR_GROUPS.map(group => `
                <div class="design-group">
                    <div class="design-group-label">${t(group.labelKey)}</div>
                    <div class="design-swatches">
                        ${group.items.map(item => {
                            const label = t(item.labelKey);
                            return `
                            <div class="color-swatch" data-var="${item.var}" data-alpha="${!!item.hasAlpha}" title="${label}: ${item.var}">
                                <div class="swatch-color-wrap">
                                    <div class="swatch-checker"></div>
                                    <div class="swatch-color" style="background:${DEFAULT_COLORS[item.var]}"></div>
                                </div>
                                <span class="swatch-label">${label}</span>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            `).join('');
        }

        // Font dropdown
        const fontSelect = document.getElementById('design-font-select');
        if (fontSelect) {
            fontSelect.addEventListener('change', () => applyFont(fontSelect.value));
        }

        // Swatch click handlers
        document.querySelectorAll('#stab-design .color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                e.stopPropagation();
                openPicker(swatch, swatch.dataset.var, swatch.dataset.alpha === 'true');
            });
        });

        // Set Default button
        const setDefaultBtn = document.getElementById('design-set-default-btn');
        if (setDefaultBtn) {
            setDefaultBtn.addEventListener('click', () => {
                if (confirm(t('design.confirm_set_default'))) {
                    const currentVals = readValues();
                    localStorage.setItem('clipq_custom_defaults', JSON.stringify(currentVals));
                    alert(t('design.alert_set_default'));
                }
            });
        }

        // Reset button
        const resetBtn = document.getElementById('design-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const hasCustom = !!localStorage.getItem('clipq_custom_defaults');
                if (hasCustom) {
                    const choice = confirm(t('design.confirm_reset_custom'));
                    if (choice) {
                        resetToDefaults(true);
                    } else {
                        if (confirm(t('design.confirm_reset_factory'))) {
                            localStorage.removeItem('clipq_custom_defaults');
                            resetToDefaults(false);
                        }
                    }
                } else {
                    if (confirm(t('design.confirm_reset_all'))) {
                        resetToDefaults(false);
                    }
                }
            });
        }
    }

    function populate(designSettings) {
        if (!designSettings) return;
        const colors = designSettings.colors || {};

        document.querySelectorAll('#stab-design .color-swatch').forEach(swatch => {
            const cssVar = swatch.dataset.var;
            const color = colors[cssVar] ||
                          document.documentElement.style.getPropertyValue(cssVar).trim() ||
                          getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() ||
                          DEFAULT_COLORS[cssVar];
            if (color) swatch.querySelector('.swatch-color').style.background = color;
        });

        const fontSelect = document.getElementById('design-font-select');
        if (fontSelect && designSettings.fontFamily) fontSelect.value = designSettings.fontFamily;
    }

    function readValues() {
        const colors = {};
        // Only save colors that have an inline override (user-customized)
        Object.keys(DEFAULT_COLORS).forEach(cssVar => {
            const val = document.documentElement.style.getPropertyValue(cssVar).trim();
            if (val) colors[cssVar] = val;
        });
        const fontSelect = document.getElementById('design-font-select');
        return {
            colors,
            fontFamily: fontSelect ? fontSelect.value : 'Inter'
        };
    }

    function saveOriginalValues() {
        originalValues = {};
        Object.keys(DEFAULT_COLORS).forEach(v => {
            originalValues[v] = document.documentElement.style.getPropertyValue(v).trim() ||
                                getComputedStyle(document.documentElement).getPropertyValue(v).trim() ||
                                DEFAULT_COLORS[v];
        });
        originalValues['--font-family'] =
            document.documentElement.style.getPropertyValue('--font-family').trim() ||
            getComputedStyle(document.documentElement).getPropertyValue('--font-family').trim();
    }

    function revertToOriginal() {
        closePicker();
        Object.entries(originalValues).forEach(([varName, value]) => {
            document.documentElement.style.setProperty(varName, value);
        });
        // Re-populate swatches with original values
        document.querySelectorAll('#stab-design .color-swatch').forEach(swatch => {
            const cssVar = swatch.dataset.var;
            const color = originalValues[cssVar] || DEFAULT_COLORS[cssVar];
            if (color) swatch.querySelector('.swatch-color').style.background = color;
        });
        // Revert font dropdown
        const fontSelect = document.getElementById('design-font-select');
        if (fontSelect && originalValues['--font-family']) {
            const match = FONTS.find(f => originalValues['--font-family'].includes(f.name));
            if (match) fontSelect.value = match.name;
        }
    }

    function applyAll(designSettings) {
        if (!designSettings) return;
        const colors = designSettings.colors || {};
        Object.entries(colors).forEach(([varName, value]) => {
            document.documentElement.style.setProperty(varName, value);
        });
        if (designSettings.fontFamily) applyFont(designSettings.fontFamily);
    }

    function getEffectiveDefaults() {
        try {
            const custom = JSON.parse(localStorage.getItem('clipq_custom_defaults'));
            if (custom && custom.colors) {
                return {
                    colors: { ...DEFAULT_COLORS, ...custom.colors },
                    font: custom.fontFamily || 'Inter'
                };
            }
        } catch (e) {}
        return {
            colors: DEFAULT_COLORS,
            font: 'Inter'
        };
    }

    function resetToDefaults(useCustom) {
        closePicker();
        let defs;
        if (useCustom === false) {
            defs = { colors: DEFAULT_COLORS, font: 'Inter' };
        } else {
            defs = getEffectiveDefaults();
        }

        Object.entries(defs.colors).forEach(([varName, value]) => {
            document.documentElement.style.setProperty(varName, value);
        });
        
        const fontName = defs.font || 'Inter';
        const fontMatch = FONTS.find(f => f.name === fontName) || FONTS[0];
        document.documentElement.style.setProperty('--font-family', fontMatch.value);

        document.querySelectorAll('#stab-design .color-swatch').forEach(swatch => {
            const cssVar = swatch.dataset.var;
            const color = defs.colors[cssVar];
            if (color) swatch.querySelector('.swatch-color').style.background = color;
        });

        const fontSelect = document.getElementById('design-font-select');
        if (fontSelect) fontSelect.value = fontName;
    }

    return { init, populate, readValues, saveOriginalValues, revertToOriginal, applyAll, closePicker };
})();
