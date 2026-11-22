/**
 * history.js — History view filtering, pagination, rendering, and item deletion
 */
window.ClipQ = window.ClipQ || {};

ClipQ.History = (() => {
    'use strict';

    let renderLimit = 200;
    let searchQuery = '';

    function resetLimit() {
        renderLimit = 200;
    }

    function matchesSearch(item, query) {
        if (!query) return true;
        const meta = item.meta || {};
        const haystack = [
            meta.title,
            meta.channel,
            meta.creator,
            item.provider,
            item.url,
            ...(Array.isArray(item.submitters) ? item.submitters : []),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(query);
    }

    function render(renderThumbFn) {
        const view = document.getElementById('history-view');
        if (view && view.classList.contains('hidden')) return;

        const t = ClipQ.I18n.t.bind(ClipQ.I18n);
        const hist = ClipQ.Queue.getHistory();
        const grid = document.getElementById('history-grid');
        const moreWrap = document.getElementById('history-more-wrap');
        const moreBtn = document.getElementById('history-load-more-btn');
        if (!grid) return;

        if (hist.length === 0) {
            grid.innerHTML = `<div class="history-empty">${ClipQ.escapeHtml(t('history.empty'))}</div>`;
            if (moreWrap) moreWrap.classList.add('hidden');
            return;
        }

        const q = searchQuery.trim().toLowerCase();
        const filtered = hist.slice().reverse().filter((item) => matchesSearch(item, q));
        if (filtered.length === 0) {
            grid.innerHTML = `<div class="history-empty">${ClipQ.escapeHtml(t('history.search_empty'))}</div>`;
            if (moreWrap) moreWrap.classList.add('hidden');
            return;
        }

        const deleteTitle = ClipQ.escapeHtml(t('history.delete'));
        const closeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        const visible = filtered.slice(0, renderLimit);
        grid.innerHTML = visible.map((item) => {
            const meta = item.meta || {};
            const rawUrl = ClipQ.Providers && ClipQ.Providers.getCanonicalUrl
                ? ClipQ.Providers.getCanonicalUrl(item.provider, item.clipId, item.url)
                : item.url;
            const safeUrl = ClipQ.sanitizeUrl(rawUrl);
            const thumbMarkup = renderThumbFn ? renderThumbFn(item, 'history-thumb') : '';
            const inner = `${thumbMarkup}<div class="history-info"><div class="history-title">${ClipQ.escapeHtml(meta.title || 'Clip')}</div><div class="history-channel">${ClipQ.escapeHtml(meta.channel || item.provider)}</div></div>`;
            const body = safeUrl
                ? `<a class="history-item-link" href="${ClipQ.escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
                : inner;
            return `<div class="history-item" data-id="${ClipQ.escapeHtml(item.id || '')}">${body}<button type="button" class="history-item-delete" title="${deleteTitle}" aria-label="${deleteTitle}">${closeIcon}</button></div>`;
        }).join('');

        const remaining = filtered.length - visible.length;
        if (moreWrap && moreBtn) {
            moreWrap.classList.toggle('hidden', remaining <= 0);
            if (remaining > 0) moreBtn.textContent = t('history.load_more', { count: remaining });
        }
    }

    function init(renderThumbFn, bindThumbFallbackFn) {
        const searchInput = document.getElementById('history-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                searchQuery = searchInput.value;
                renderLimit = 200;
                render(renderThumbFn);
            });
        }

        document.getElementById('history-load-more-btn')?.addEventListener('click', () => {
            renderLimit += 200;
            render(renderThumbFn);
        });

        const historyGrid = document.getElementById('history-grid');
        if (historyGrid) {
            if (bindThumbFallbackFn) bindThumbFallbackFn(historyGrid);
            historyGrid.addEventListener('click', async (e) => {
                const deleteBtn = e.target.closest('.history-item-delete');
                if (!deleteBtn) return;
                e.preventDefault();
                e.stopPropagation();
                const id = deleteBtn.closest('.history-item')?.dataset.id;
                if (!id) return;
                const confirmed = await ClipQ.confirmAction({
                    message: ClipQ.I18n.t('history.confirm_delete'),
                    yesLabel: ClipQ.I18n.t('history.confirm_yes'),
                    cancelLabel: ClipQ.I18n.t('history.confirm_cancel'),
                });
                if (!confirmed) return;
                const result = ClipQ.Queue.removeHistoryById(id);
                if (result.removed) {
                    if (result.clearedActivePlayback) {
                        ClipQ.Player.showEmpty();
                        ClipQ.App.updateNextButton();
                    }
                    render(renderThumbFn);
                }
            });
        }
    }

    return { init, render, resetLimit };
})();
