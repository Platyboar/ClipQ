"""Browser E2E checks for dynamic OAuth origin, local flags/fonts, and cloud sync (>500 history)."""

SYNC_TEST_JS = """
(async () => {
    const out = {};

    const loginUrl = new URL(ClipQ.Auth.getLoginUrl());
    out.loginRedirectMatchesOrigin = loginUrl.searchParams.get('redirect_uri') === (window.location.origin + '/');
    out.localFlagsAllPresent = ClipQ.I18n.getAvailableLanguages().every(
        l => typeof l.flag === 'string' && l.flag.startsWith('/img/flags/') && l.flag.endsWith('.png')
    );

    const aboutPrivacyHeading = document.querySelector('#stab-about .about-privacy-title')?.textContent || '';
    out.aboutPrivacyRendered = Boolean(aboutPrivacyHeading.trim());
    out.offlineDeleteCloudHidden = document.getElementById('settings-delete-cloud')?.classList.contains('hidden');

    const cloudHistoryPage1 = [];
    const cloudHistoryPage2 = [];
    for (let i = 1; i <= 550; i++) {
        const entry = {
            id: 'cloud_' + i,
            provider: 'youtube',
            clipId: 'vid_' + String(i).padStart(7, '0'),
            url: 'https://youtu.be/vid_' + String(i).padStart(7, '0'),
            meta: { title: 'Cloud Clip ' + i, channel: 'Chan' },
            addedAt: 1000 + i,
            watchedAt: 2000 + i
        };
        if (i <= 50) cloudHistoryPage2.push(entry);
        else cloudHistoryPage1.push(entry);
    }

    const calls = { putConfig: 0, postHistory: 0, postMemory: 0, deleteAll: 0 };
    const origFetch = window.fetch.bind(window);
    window.fetch = async (url, opts) => {
        const u = typeof url === 'string' ? url : '';
        const method = (opts?.method || 'GET').toUpperCase();
        if (u === '/health') {
            return new Response(JSON.stringify({ ok: true, sync: true }), { status: 200 });
        }
        if (u.startsWith('/api/sync/history?offset=')) {
            return new Response(JSON.stringify({ items: cloudHistoryPage2, offset: 500, hasMore: false }), { status: 200 });
        }
        if (u === '/api/sync/config' && method === 'PUT') {
            calls.putConfig++;
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (u === '/api/sync/history' && method === 'POST') {
            calls.postHistory++;
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (u === '/api/sync/memory' && method === 'POST') {
            calls.postMemory++;
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (u === '/api/sync/export' && method === 'GET') {
            return new Response(JSON.stringify({ exportedAt: '2026-11-16T00:00:00Z', history: [], memory: [] }), { status: 200 });
        }
        if (u === '/api/sync' && method === 'DELETE') {
            calls.deleteAll++;
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }
        if (u.startsWith('/api/sync?limit=')) {
            return new Response(JSON.stringify({
                exists: true,
                userId: '99999',
                login: 'teststreamer',
                config: {
                    settings: { appTitle: 'SyncedTitle', providers: { twitch: true, twitch_vod: true, youtube: true, tiktok: true, instagram: true } },
                    customDesign: null,
                    customLayout: null,
                    queue: null,
                    language: 'en',
                    autoplay: true
                },
                history: cloudHistoryPage1,
                historyTotal: 550,
                hasMoreHistory: true,
                memory: ['youtube:seen_1']
            }), { status: 200 });
        }
        return origFetch(url, opts);
    };

    try {
        const synced = await ClipQ.Sync.init({ id: '99999', login: 'teststreamer' });
        await new Promise(r => setTimeout(r, 80));
        out.syncAvailable = synced && ClipQ.Sync.isAvailable();
        out.loadedOver500History = ClipQ.Queue.getHistory().length === 550;
        out.oldestLoadedFirst = ClipQ.Queue.getHistory()[0]?.id === 'cloud_1';
        out.syncedAppTitle = JSON.parse(localStorage.getItem('clipq_settings') || '{}').appTitle || null;

        document.querySelector('.menu-tabs .tab[data-tab="history"]').click();
        const cardsBeforeMore = document.querySelectorAll('#history-grid .history-item').length;
        const loadMoreBtn = document.getElementById('history-load-more-btn');
        const loadMoreVisible = !document.getElementById('history-more-wrap')?.classList.contains('hidden');
        loadMoreBtn?.click();
        const cardsAfterMore = document.querySelectorAll('#history-grid .history-item').length;
        document.querySelector('.menu-tabs .tab[data-tab="queue"]').click();
        out.historyPaging = { cardsBeforeMore, loadMoreVisible, cardsAfterMore };

        ClipQ.Settings.load();
        document.getElementById('user-menu-toggle').click();
        document.getElementById('dropdown-settings').click();
        out.onlineDeleteCloudVisible = !document.getElementById('settings-delete-cloud')?.classList.contains('hidden');
        document.getElementById('settings-close').click();

        await ClipQ.Sync.exportBackup();
        const deleted = await ClipQ.Sync.deleteAllCloudData();
        out.deletedCloud = deleted && !ClipQ.Sync.isAvailable() && localStorage.getItem('clipq_history') === null;
        out.calls = calls;
    } finally {
        window.fetch = origFetch;
        localStorage.removeItem('clipq_settings');
        localStorage.removeItem('clipq_history');
        localStorage.removeItem('clipq_memory');
        localStorage.removeItem('clipq_queue');
        localStorage.removeItem('clipq_autoplay');
        localStorage.removeItem('clipq_sync_owner');
        localStorage.setItem('clipq_language', 'en');
    }

    return out;
})()
"""


def assert_sync_report(report):
    """Assert dynamic OAuth redirect, local assets, and cloud sync (>500 history) checks passed."""
    assert report['loginRedirectMatchesOrigin'], f'OAuth redirect URI not dynamic: {report}'
    assert report['localFlagsAllPresent'], f'Non-local flags detected: {report}'
    assert report['aboutPrivacyRendered'], f'About privacy section missing: {report}'
    assert report['offlineDeleteCloudHidden'], f'Delete cloud button should hide offline: {report}'
    assert report['syncAvailable'] and report['loadedOver500History'], f'Cloud history >500 failed: {report}'
    assert report['oldestLoadedFirst'] and report['syncedAppTitle'] == 'SyncedTitle', (
        f'Cloud sync order/title failed: {report}'
    )
    assert report['historyPaging'] == {
        'cardsBeforeMore': 200,
        'loadMoreVisible': True,
        'cardsAfterMore': 400,
    }, f'History pagination failed: {report["historyPaging"]}'
    assert report['onlineDeleteCloudVisible'], f'Delete cloud button hidden when online: {report}'
    assert report['deletedCloud'] and report['calls']['deleteAll'] == 1, f'Cloud deletion failed: {report}'
