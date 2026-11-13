/**
 * design-picker.js - Interactive HSV color wheel + RGBA popup picker
 */
window.ClipQ = window.ClipQ || {};

ClipQ.ColorPicker = (() => {
    'use strict';

    const t = (key, params) => ClipQ.I18n.t(key, params);

    const CANVAS_SIZE = 220;
    const RING_OUTER = 105;
    const RING_INNER = 78;
    const SQ_SIZE = 100;
    const SQ_OFFSET = (CANVAS_SIZE - SQ_SIZE) / 2;

    let pickerPopup = null;
    let activeAnchor = null;
    let onColorChange = null;
    let currentHSV = { h: 0, s: 0, v: 0 };
    let currentAlpha = 1;
    let dragging = null; // 'ring' | 'square' | null
    let outsideClickTimer = null;

    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    function hexToRgb(hex) {
        let clean = hex.replace('#', '');
        if (clean.length === 3) {
            clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
        }
        if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
        return {
            r: parseInt(clean.substring(0, 2), 16) || 0,
            g: parseInt(clean.substring(2, 4), 16) || 0,
            b: parseInt(clean.substring(4, 6), 16) || 0
        };
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(c =>
            clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')
        ).join('');
    }

    function rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else h = ((r - g) / d + 4) / 6;
        }
        return { h: h * 360, s, v };
    }

    function hsvToRgb(h, s, v) {
        h = ((h % 360) + 360) % 360;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function parseColor(str) {
        const clean = (str || '').trim();
        const match = clean.match(
            /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/
        );
        if (match) {
            return {
                r: clamp(parseInt(match[1], 10) || 0, 0, 255),
                g: clamp(parseInt(match[2], 10) || 0, 0, 255),
                b: clamp(parseInt(match[3], 10) || 0, 0, 255),
                a: match[4] !== undefined ? clamp(parseFloat(match[4]) || 0, 0, 1) : 1
            };
        }
        return { ...hexToRgb(clean), a: 1 };
    }

    function formatColor(r, g, b, a) {
        const alpha = a !== undefined ? parseFloat(a.toFixed(2)) : 1;
        return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
    }

    function drawPicker(canvas) {
        const ctx = canvas.getContext('2d');
        const cx = CANVAS_SIZE / 2;
        const cy = CANVAS_SIZE / 2;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

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

        const hueRad = currentHSV.h * Math.PI / 180;
        const ringMid = (RING_INNER + RING_OUTER) / 2;
        drawIndicator(ctx, cx + Math.cos(hueRad) * ringMid, cy + Math.sin(hueRad) * ringMid, 8, 2.5, 'rgba(0,0,0,0.3)');

        const svx = SQ_OFFSET + currentHSV.s * SQ_SIZE;
        const svy = SQ_OFFSET + (1 - currentHSV.v) * SQ_SIZE;
        drawIndicator(ctx, svx, svy, 6, 2, 'rgba(0,0,0,0.25)');
    }

    function drawIndicator(ctx, x, y, radius, lineWidth, outerStroke) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, radius + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = outerStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    function getCanvasZone(x, y) {
        const cx = CANVAS_SIZE / 2;
        const cy = CANVAS_SIZE / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist >= RING_INNER && dist <= RING_OUTER + 4) return 'ring';
        if (x >= SQ_OFFSET && x <= SQ_OFFSET + SQ_SIZE &&
            y >= SQ_OFFSET && y <= SQ_OFFSET + SQ_SIZE) {
            return 'square';
        }
        return null;
    }

    function handleCanvasInput(canvas, x, y, zone) {
        const cx = CANVAS_SIZE / 2;
        const cy = CANVAS_SIZE / 2;
        if (zone === 'ring') {
            const angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
            currentHSV.h = ((angle % 360) + 360) % 360;
        } else if (zone === 'square') {
            currentHSV.s = clamp((x - SQ_OFFSET) / SQ_SIZE, 0, 1);
            currentHSV.v = clamp(1 - (y - SQ_OFFSET) / SQ_SIZE, 0, 1);
        }
        drawPicker(canvas);
        syncFromHSV();
    }

    function updatePreview(rgb) {
        if (!pickerPopup) return;
        const el = pickerPopup.querySelector('.cp-preview');
        if (el) el.style.background = formatColor(rgb.r, rgb.g, rgb.b, currentAlpha);
    }

    function updateAlphaTrack(rgb) {
        if (!pickerPopup) return;
        const track = pickerPopup.querySelector('.cp-alpha');
        if (track) {
            track.style.background =
                `linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgb(${rgb.r},${rgb.g},${rgb.b})),` +
                'repeating-conic-gradient(#333 0% 25%, #555 0% 50%) 50% / 8px 8px';
            track.style.borderRadius = '4px';
        }
    }

    function emitColorChange() {
        const rgb = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
        const colorStr = formatColor(rgb.r, rgb.g, rgb.b, currentAlpha);
        if (onColorChange) onColorChange(colorStr);
    }

    function syncRgbInputs(rgb) {
        if (!pickerPopup) return;
        pickerPopup.querySelector('.cp-r').value = rgb.r;
        pickerPopup.querySelector('.cp-g').value = rgb.g;
        pickerPopup.querySelector('.cp-b').value = rgb.b;
    }

    function syncFromHSV() {
        const rgb = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
        if (pickerPopup) {
            pickerPopup.querySelector('.cp-hex').value = rgbToHex(rgb.r, rgb.g, rgb.b);
            syncRgbInputs(rgb);
            updatePreview(rgb);
            updateAlphaTrack(rgb);
        }
        emitColorChange();
    }

    function syncFromRGB() {
        if (!pickerPopup) return;
        const r = clamp(parseInt(pickerPopup.querySelector('.cp-r').value, 10) || 0, 0, 255);
        const g = clamp(parseInt(pickerPopup.querySelector('.cp-g').value, 10) || 0, 0, 255);
        const b = clamp(parseInt(pickerPopup.querySelector('.cp-b').value, 10) || 0, 0, 255);
        currentHSV = rgbToHsv(r, g, b);
        pickerPopup.querySelector('.cp-hex').value = rgbToHex(r, g, b);
        updatePreview({ r, g, b });
        updateAlphaTrack({ r, g, b });
        drawPicker(pickerPopup.querySelector('.cp-canvas'));
        emitColorChange();
    }

    function syncFromHex() {
        if (!pickerPopup) return;
        let hex = pickerPopup.querySelector('.cp-hex').value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9a-fA-F]{3}$/.test(hex) && !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
        const rgb = hexToRgb(hex);
        currentHSV = rgbToHsv(rgb.r, rgb.g, rgb.b);
        syncRgbInputs(rgb);
        updatePreview(rgb);
        updateAlphaTrack(rgb);
        drawPicker(pickerPopup.querySelector('.cp-canvas'));
        emitColorChange();
    }

    function syncFromAlpha() {
        if (!pickerPopup) return;
        currentAlpha = clamp(parseFloat(pickerPopup.querySelector('.cp-alpha').value) || 0, 0, 1);
        pickerPopup.querySelector('.cp-alpha-val').textContent = Math.round(currentAlpha * 100) + '%';
        updatePreview(hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v));
        emitColorChange();
    }

    function onPickerDrag(e) {
        if (!dragging || !pickerPopup) return;
        const canvas = pickerPopup.querySelector('.cp-canvas');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width);
        const y = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height);
        handleCanvasInput(canvas, x, y, dragging);
    }

    function onPickerDragEnd() {
        dragging = null;
    }

    function onOutsideClick(e) {
        if (pickerPopup && !pickerPopup.contains(e.target) && !e.target.closest('.color-swatch')) {
            close();
        }
    }

    function positionPopup(anchor, popup) {
        const popupWidth = 300;
        const rect = anchor.getBoundingClientRect();
        let left = rect.right + 12;
        let top = rect.top - 40;
        if (left + popupWidth > window.innerWidth - 10) left = rect.left - popupWidth - 12;
        if (left < 10) left = 10;
        if (top + 400 > window.innerHeight) top = window.innerHeight - 410;
        if (top < 10) top = 10;
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }

    function open({ anchorEl, initialColor, onChange }) {
        close();

        activeAnchor = anchorEl;
        onColorChange = onChange;
        anchorEl.classList.add('swatch-active');

        const parsed = parseColor(initialColor);
        currentHSV = rgbToHsv(parsed.r, parsed.g, parsed.b);
        currentAlpha = parsed.a;
        const safePreview = formatColor(parsed.r, parsed.g, parsed.b, parsed.a);

        const popup = document.createElement('div');
        popup.className = 'color-picker-popup';
        popup.innerHTML = `
            <canvas class="cp-canvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
            <div class="cp-alpha-row">
                <label>${ClipQ.escapeHtml(t('design.color.opacity'))}</label>
                <input type="range" class="cp-alpha" min="0" max="1" step="0.01" value="${currentAlpha}">
                <span class="cp-alpha-val">${Math.round(currentAlpha * 100)}%</span>
            </div>
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
                    <div class="cp-preview" style="background:${safePreview}"></div>
                </div>
            </div>
        `;

        document.body.appendChild(popup);
        pickerPopup = popup;
        positionPopup(anchorEl, popup);

        const canvas = popup.querySelector('.cp-canvas');
        drawPicker(canvas);
        updateAlphaTrack(parsed);

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (CANVAS_SIZE / rect.width);
            const y = (e.clientY - rect.top) * (CANVAS_SIZE / rect.height);
            dragging = getCanvasZone(x, y);
            if (dragging) handleCanvasInput(canvas, x, y, dragging);
        });

        popup.querySelector('.cp-hex').addEventListener('input', syncFromHex);
        popup.querySelector('.cp-r').addEventListener('input', syncFromRGB);
        popup.querySelector('.cp-g').addEventListener('input', syncFromRGB);
        popup.querySelector('.cp-b').addEventListener('input', syncFromRGB);
        popup.querySelector('.cp-alpha').addEventListener('input', syncFromAlpha);

        document.addEventListener('mousemove', onPickerDrag);
        document.addEventListener('mouseup', onPickerDragEnd);

        const modalBody = document.querySelector('#settings-overlay .modal-body');
        if (modalBody) modalBody.addEventListener('scroll', close, { once: true });

        if (outsideClickTimer) clearTimeout(outsideClickTimer);
        outsideClickTimer = setTimeout(() => {
            outsideClickTimer = null;
            if (pickerPopup) document.addEventListener('mousedown', onOutsideClick);
        }, 50);
    }

    function close() {
        if (outsideClickTimer) {
            clearTimeout(outsideClickTimer);
            outsideClickTimer = null;
        }
        if (activeAnchor) activeAnchor.classList.remove('swatch-active');
        if (pickerPopup) {
            pickerPopup.remove();
            pickerPopup = null;
        }
        activeAnchor = null;
        onColorChange = null;
        dragging = null;
        document.removeEventListener('mousemove', onPickerDrag);
        document.removeEventListener('mouseup', onPickerDragEnd);
        document.removeEventListener('mousedown', onOutsideClick);
        const modalBody = document.querySelector('#settings-overlay .modal-body');
        if (modalBody) modalBody.removeEventListener('scroll', close);
    }

    return { open, close };
})();
