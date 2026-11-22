"""Browser E2E checks for dynamic OAuth origin, local flags/fonts, and cloud sync (>500 history)."""

SYNC_TEST_JS = """
(async () => {
    const out = {};

    const loginUrl = new URL(ClipQ.Auth.getLoginUrl());
    out.loginRedirectMatchesOrigin = loginUrl.searchParams.get('redirect_uri') === (window.location.origin + '/') && (loginUrl.searchParams.get('scope') || '').includes('user:write:chat');
    out.normalMenubarVisible = getComputedStyle(document.getElementById('menubar')).display !== 'none';
    out.obsUrlValue = document.getElementById('set-obs-url')?.value || '';
    history.replaceState(null, '', '/obs/obs_key_alpha_1234567890');
    document.body.classList.toggle('obs-mode', ClipQ.Auth.isObsMode());
    ClipQ.Settings.applyTopbarVisibility({ obsShowTopbar: false });
    out.obsKeyExtractedFromPath = ClipQ.Auth.getUrlObsKey();
    out.obsMenubarHiddenOnPath = ClipQ.Auth.isObsMode() && getComputedStyle(document.getElementById('menubar')).display === 'none';
    ClipQ.Settings.applyTopbarVisibility({ obsShowTopbar: true });
    out.obsMenubarShownWhenTopbarOn = ClipQ.Auth.isObsMode() && getComputedStyle(document.getElementById('menubar')).display !== 'none';
    history.replaceState(null, '', '/?obs=1');
    ClipQ.Settings.applyTopbarVisibility({ obsShowTopbar: false });
    out.obsDetectedOnQuery = ClipQ.Auth.isObsMode();
    history.replaceState(null, '', '/');
    document.body.classList.toggle('obs-mode', ClipQ.Auth.isObsMode());
    ClipQ.Settings.applyTopbarVisibility({ obsShowTopbar: false });
    out.browserMenubarAlwaysVisible = getComputedStyle(document.getElementById('menubar')).display !== 'none';
    out.localFlagsAllPresent = ClipQ.I18n.getAvailableLanguages().every(
        l => typeof l.flag === 'string' && l.flag.startsWith('/img/flags/') && l.flag.endsWith('.png')
    );

    const aboutPrivacyHeading = document.querySelector('#stab-about .about-privacy-title')?.textContent || '';
    out.aboutPrivacyRendered = Boolean(aboutPrivacyHeading.trim());
    out.removeExampleText = document.getElementById('example-cmd-remove')?.textContent || '';
    out.offlineDeleteCloudHidden = document.getElementById('settings-delete-cloud')?.classList.contains('hidden');

    ClipQ.Queue.clear();
    ClipQ.Queue.setOpen(true);
    ClipQ.Queue.addClip({
        provider: 'youtube',
        clipId: 'rmUser11111',
        url: 'https://youtu.be/rmUser11111',
        meta: { title: 'Remove User Clip', channel: 'Chan' }
    }, { name: 'Platyboar', login: 'platyboar' });
    ClipQ.Queue.removeSubmitter('platyboar');
    out.removedSubmitterCount = ClipQ.Queue.getItems().length;

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

    const calls = { putConfig: 0, keepalivePut: false, proxyAuthOk: false, obsSyncOk: false, obsTwitchMetaOk: false, postHistory: 0, postMemory: 0, deleteAll: 0, chatPosts: 0 };
    const origFetch = window.fetch.bind(window);
    window.fetch = async (url, opts) => {
        const u = typeof url === 'string' ? url : '';
        const method = (opts?.method || 'GET').toUpperCase();
        const hdrs = new Headers(opts?.headers || {});
        if (u === 'https://api.twitch.tv/helix/chat/messages' && method === 'POST') { calls.chatPosts++; return new Response(JSON.stringify({ data: [{ is_sent: true }] }), { status: 200 }); }
        if (u === '/health') return new Response(JSON.stringify({ ok: true, sync: true }), { status: 200 });
        if (u.startsWith('/api/oembed')) {
            calls.proxyAuthOk = hdrs.get('Authorization') === 'Bearer mock_test_token';
            if (u.includes('DeadYt1')) return new Response(JSON.stringify({ error: 'Upstream HTTP 404' }), { status: 502 });
            return new Response(JSON.stringify({ title: 'Mock' }), { status: 200 });
        }
        if (u.startsWith('/api/twitch-meta')) {
            calls.obsTwitchMetaOk = hdrs.get('X-ClipQ-Obs-Key') === 'obs_key_beta_9876543210';
            return new Response(JSON.stringify({
                configured: true,
                available: true,
                unavailable: false,
                meta: { title: 'OBS Clip Title', channel: 'Streamer', duration: 22 }
            }), { status: 200 });
        }
        if (u === '/api/sync/obs-key' && method === 'POST') {
            return new Response(JSON.stringify({ obsKey: 'obs_key_beta_9876543210' }), { status: 200 });
        }
        if (u.startsWith('/api/sync/history?offset=')) {
            return new Response(JSON.stringify({ items: cloudHistoryPage2, offset: 500, hasMore: false }), { status: 200 });
        }
        if (u === '/api/sync/config' && method === 'PUT') {
            calls.putConfig++;
            if (opts?.keepalive) calls.keepalivePut = true;
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
            const obsHdr = hdrs.get('X-ClipQ-Obs-Key');
            if (obsHdr === 'obs_key_revoked_00000000') {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
            }
            if (obsHdr === 'obs_key_beta_9876543210') {
                calls.obsSyncOk = true;
            }
            return new Response(JSON.stringify({
                exists: true, userId: '99999', login: 'teststreamer', displayName: 'TestStreamer',
                avatar: obsHdr ? 'https://static-cdn.jtvnw.net/obs-u1.png' : '',
                obsKey: obsHdr ? undefined : 'obs_key_alpha_1234567890',
                config: { settings: { appTitle: 'SyncedTitle', providers: { twitch: true, twitch_vod: true, youtube: true, tiktok: true, instagram: true }, design: { showBadges: true, showChat: true } }, customDesign: null, customLayout: null, queue: null, language: 'en', autoplay: true },
                history: cloudHistoryPage1, historyTotal: 550, hasMoreHistory: true, memory: ['youtube:seen_1']
            }), { status: 200 });
        }
        if (u === 'https://7tv.io/v3/emote-sets/global') {
            return new Response(JSON.stringify({ emotes: [{ id: 'stvG1', name: 'StvGlobal', data: { host: { url: '//cdn.7tv.app/emote/stvG1', files: [{ name: '2x.webp' }] } } }] }), { status: 200 });
        }
        if (u.startsWith('https://7tv.io/v3/users/twitch/')) {
            return new Response(JSON.stringify({ emote_set: { emotes: [{ id: 'stvC1', name: 'StvChan', data: { host: { url: '//cdn.7tv.app/emote/stvC1', files: [{ name: '2x.webp' }] } } }] } }), { status: 200 });
        }
        if (u === 'https://api.betterttv.net/3/cached/emotes/global') {
            return new Response(JSON.stringify([{ id: 'bttvG1', code: 'BttvGlobal' }]), { status: 200 });
        }
        if (u.startsWith('https://api.betterttv.net/3/cached/users/twitch/')) {
            return new Response(JSON.stringify({ channelEmotes: [{ id: 'bttvC1', code: 'BttvChan' }], sharedEmotes: [] }), { status: 200 });
        }
        if (u === 'https://api.frankerfacez.com/v1/set/global') {
            return new Response(JSON.stringify({ default_sets: [1], sets: { 1: { emoticons: [{ id: 101, name: 'FfzGlobal', urls: { '2': '//cdn.frankerfacez.com/emote/101/2' } }] } } }), { status: 200 });
        }
        if (u.startsWith('https://api.frankerfacez.com/v1/room/id/')) {
            return new Response(JSON.stringify({ room: { set: 2 }, sets: { 2: { emoticons: [{ id: 202, name: 'FfzChan', urls: { '2': '//cdn.frankerfacez.com/emote/202/2' } }] } } }), { status: 200 });
        }
        if (u === 'https://gql.twitch.tv/gql') {
            const parsed = JSON.parse(opts?.body || '{}');
            const slug = parsed?.variables?.slug || '';
            if (slug === 'DeadTwitch1') return new Response(JSON.stringify({ data: { clip: null } }), { status: 200 });
            if (slug === 'FailedTranscodeClip') {
                return new Response(JSON.stringify({ data: { clip: { assets: [{ creationState: 'FAILED' }], playbackAccessToken: { signature: 'sig123', value: JSON.stringify({ clip_uri: 'https://d1ndex63qxojbr.cloudfront.net/hevc/1440/index.mp4' }) }, videoQualities: [] } } }), { status: 200 });
            }
            return new Response(JSON.stringify({ data: { clip: { assets: [{ creationState: 'CREATED' }], playbackAccessToken: { signature: 'sig456', value: JSON.stringify({ clip_uri: 'https://d1ndex63qxojbr.cloudfront.net/avc/1080/index.mp4' }) }, videoQualities: [{ quality: '1080', sourceURL: 'https://d1ndex63qxojbr.cloudfront.net/avc/1080/index.mp4' }] } } }), { status: 200 });
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
        const histSearch = document.getElementById('history-search');
        const searchCount = (q) => { histSearch.value = q; histSearch.dispatchEvent(new Event('input')); return document.querySelectorAll('#history-grid .history-item').length; };
        out.historySearchOk = Boolean(histSearch && cardsAfterMore === 400 && searchCount('Cloud Clip 505') === 1 && searchCount('no_such_clip_match_xyz') === 0 && searchCount('') === 200);
        document.querySelector('.menu-tabs .tab[data-tab="queue"]').click();
        out.historyPaging = { cardsBeforeMore, loadMoreVisible, cardsAfterMore };

        ClipQ.Settings.load();
        document.getElementById('user-menu-toggle').click();
        document.getElementById('dropdown-settings').click();
        out.onlineDeleteCloudVisible = !document.getElementById('settings-delete-cloud')?.classList.contains('hidden');
        const genBtns = Array.from(document.querySelectorAll('.general-action-bar .btn'));
        out.generalButtonsSingleRow = genBtns.length === 4 && new Set(genBtns.map(b => Math.round(b.getBoundingClientRect().top))).size === 1;
        out.obsCoverInitiallyMasked = document.getElementById('obs-url-group')?.classList.contains('obs-masked');
        document.getElementById('reveal-obs-url-btn').click();
        out.obsCoverUnmaskedOnClick = !document.getElementById('obs-url-group')?.classList.contains('obs-masked');
        document.querySelector('.modal-tabs .tab[data-stab="design"]').click();
        out.obsCoverRemaskedOnTabLeave = document.getElementById('obs-url-group')?.classList.contains('obs-masked');
        document.querySelector('.modal-tabs .tab[data-stab="general"]').click();
        document.getElementById('reveal-obs-url-btn').click();

        const putBeforeNoOp = calls.putConfig;
        document.getElementById('settings-save').click();
        await new Promise(r => setTimeout(r, 80));
        out.noOpSaveSkippedSync = calls.putConfig === putBeforeNoOp;
        out.purgeDefaultRoles = ClipQ.Settings.get().commands.purgememory.roles;
        ClipQ.Memory.add('https://youtu.be/cloud_1', 'youtube', 'cloud_1');
        const memClip = ClipQ.Queue.getHistory().find(c => c.clipId === 'cloud_1');
        if (memClip) ClipQ.Queue.removeHistoryById(memClip.id);
        ClipQ.Queue.clearHistory();
        out.memoryPreservedOnHistDelete = ClipQ.Memory.has('https://youtu.be/cloud_1', 'youtube', 'cloud_1');

        out.personalObsUrlValue = document.getElementById('set-obs-url')?.value || '';
        out.regenerateObsBtnVisible = !document.getElementById('regenerate-obs-url-btn')?.classList.contains('hidden');
        const nextObsKey = await ClipQ.Sync.regenerateObsKey();
        ClipQ.Settings.populateUI();
        out.regeneratedObsUrlValue = nextObsKey ? (document.getElementById('set-obs-url')?.value || '') : '';
        document.getElementById('settings-close').click();
        out.obsCoverRemaskedOnClose = document.getElementById('obs-url-group')?.classList.contains('obs-masked');

        await ClipQ.ChatEmotes.loadForChannel('88888');
        ClipQ.ChatFeed.applySettings({ showChat: true, chatShowBadges: true, chatShowLinks: true, chatAnimation: 'slide', chatDirection: 'bottom' });
        ClipQ.ChatFeed.appendMessage({
            id: 'msg_1',
            username: 'ChatViewer<xss>',
            login: 'chatviewer',
            color: '#ff5500',
            badges: { moderator: '1', subscriber: '12' },
            emotes: { '25': ['0-4'] },
            roles: { isMod: true },
            message: 'Kappa StvChan BttvChan FfzChan <img src=x onerror="window.__chatXss=1"> https://clips.twitch.tv/ClipOne'
        });
        ClipQ.ChatFeed.appendMessage({
            id: 'msg_2',
            username: 'SecondUser',
            login: 'seconduser',
            color: 'red;position:fixed',
            roles: {},
            message: 'https://clips.twitch.tv/OnlyUrlClip'
        });
        out.chatCountInitial = document.querySelectorAll('#chat-messages .chat-msg').length;
        out.chatMultiBadgeCount = document.querySelectorAll('#chat-messages .chat-msg')[0]?.querySelectorAll('.chat-badge').length || 0;
        out.chatEmoteCount = document.querySelectorAll('#chat-messages .chat-msg')[0]?.querySelectorAll('.chat-emote').length || 0;
        out.chatXssPrevented = typeof window.__chatXss === 'undefined';
        out.chatInvalidColorBlocked = !document.querySelectorAll('#chat-messages .chat-msg-author')[1]?.getAttribute('style');
        document.getElementById('design-chat-show-badges').click();
        out.chatBadgesHiddenClass = document.body.classList.contains('chat-badges-hidden');
        document.getElementById('design-chat-show-badges').click();
        document.getElementById('design-chat-show-links').click();
        out.chatUrlsStripped = document.querySelectorAll('#chat-messages .chat-msg').length === 1 &&
            !document.querySelector('#chat-messages .chat-msg-text')?.textContent.includes('https://');
        document.getElementById('design-chat-show-links').click();
        document.getElementById('design-show-chat').click();
        out.chatMessagesHidden = document.getElementById('chat-messages')?.classList.contains('hidden');
        out.chatOptionsCollapsed = document.getElementById('design-chat-options')?.classList.contains('hidden');
        document.getElementById('design-show-chat').click();
        ClipQ.ChatFeed.removeMessage('msg_1');
        out.chatCountAfterDeleteMsg = document.querySelectorAll('#chat-messages .chat-msg').length;
        ClipQ.ChatFeed.removeUserMessages('seconduser');
        out.chatCountAfterDeleteUser = document.querySelectorAll('#chat-messages .chat-msg').length;
        out.chatScrollbarHidden = getComputedStyle(document.getElementById('chat-messages')).scrollbarWidth === 'none';
        ClipQ.ChatFeed.applySettings({ showChat: true, chatShowBadges: true, chatShowLinks: true, chatAnimation: 'none', chatDirection: 'bottom', chatHideSeconds: 1, chatHideMode: 'none' });
        ClipQ.ChatFeed.appendMessage({ id: 'exp_1', username: 'ExpiringUser', login: 'expiringuser', roles: {}, message: 'Temporary message' });
        const expBefore = document.querySelectorAll('#chat-messages .chat-msg').length;
        await new Promise(r => setTimeout(r, 1150));
        out.chatAutoExpired = expBefore === 1 && document.querySelectorAll('#chat-messages .chat-msg').length === 0;
        document.getElementById('user-menu-toggle').click();
        document.getElementById('dropdown-settings').click();
        document.querySelector('.modal-tabs .tab[data-stab="design"]').click();
        const row1Labels = Array.from(document.querySelectorAll('.design-chat-grid > div > .form-label')).slice(0, 3);
        const row1Tops = Array.from(new Set(row1Labels.map(el => Math.round(el.getBoundingClientRect().top))));
        out.chatRow1TopAligned = row1Labels.length === 3 && row1Tops.length === 1;
        const designCfg = ClipQ.Design.readValues();
        out.chatAnimDefaultsOk = designCfg.chatAnimation === 'slide' && designCfg.chatHideMode === 'slide' && designCfg.chatEnterMs === 350 && designCfg.chatExitMs === 350;
        const chatAnimSel = document.getElementById('design-chat-animation');
        const chatExitSel = document.getElementById('design-chat-hide-mode');
        const hideSecTopBefore = Math.round(document.getElementById('design-chat-hide-seconds')?.getBoundingClientRect().top || 0);
        const badgesRowRect = document.getElementById('design-chat-show-badges')?.closest('.toggle-row')?.getBoundingClientRect();
        const linksRowRect = document.getElementById('design-chat-show-links')?.closest('.toggle-row')?.getBoundingClientRect();
        out.chatToggleGapCompact = Boolean(badgesRowRect && linksRowRect && (linksRowRect.top - badgesRowRect.bottom) <= 16);
        chatAnimSel.value = 'none';
        chatAnimSel.dispatchEvent(new Event('change'));
        const hideSecTopAfter = Math.round(document.getElementById('design-chat-hide-seconds')?.getBoundingClientRect().top || 0);
        out.enterSpeedHiddenOnNone = document.getElementById('design-chat-enter-speed-wrap')?.classList.contains('hidden');
        out.chatRow3StableOnNone = hideSecTopBefore > 0 && hideSecTopBefore === hideSecTopAfter;
        chatAnimSel.value = 'slide';
        chatAnimSel.dispatchEvent(new Event('change'));
        out.enterSpeedShownOnSlide = !document.getElementById('design-chat-enter-speed-wrap')?.classList.contains('hidden') && document.getElementById('chat-messages')?.classList.contains('anim-in-slide');
        chatExitSel.value = 'none';
        chatExitSel.dispatchEvent(new Event('change'));
        const exitNoneOk = document.getElementById('design-chat-exit-speed-wrap')?.classList.contains('hidden') && !document.getElementById('chat-messages')?.classList.contains('anim-out-slide');
        chatExitSel.value = 'slide';
        chatExitSel.dispatchEvent(new Event('change'));
        out.exitSlideApplied = Boolean(exitNoneOk && document.getElementById('chat-messages')?.classList.contains('anim-out-slide'));
        const colorGroupRows = Array.from(document.querySelectorAll('#design-colors-container .design-group-row'));
        const rowTops = (rowEl) => new Set(Array.from(rowEl?.querySelectorAll('.design-group') || []).map(g => Math.round(g.getBoundingClientRect().top))).size;
        const aligned = (a, b) => { const ra = document.querySelector(`.color-swatch[data-var="${a}"]`)?.getBoundingClientRect(), rb = document.querySelector(`.color-swatch[data-var="${b}"]`)?.getBoundingClientRect(); return Boolean(ra && rb && Math.abs(ra.left - rb.left) <= 1 && Math.abs(ra.width - rb.width) <= 1); };
        out.designColorsRowLayout = colorGroupRows.length === 3 && colorGroupRows[1].querySelectorAll('.design-group-divider').length === 1 && rowTops(colorGroupRows[1]) === 1 && colorGroupRows[2].querySelectorAll('.design-group-divider').length === 2 && rowTops(colorGroupRows[2]) === 1 && aligned('--color-border-info', '--color-queue-bg') && aligned('--color-accent', '--color-queue-item-hover') && aligned('--color-text', '--color-queue-bg') && aligned('--color-overlay', '--color-settings-bg');
        const chatBox = document.getElementById('chat-messages');
        const testMsgBefore = document.querySelectorAll('#chat-messages .chat-msg').length;
        document.getElementById('design-chat-test-btn')?.click();
        const top0 = chatBox.scrollTop;
        const sh0 = chatBox.scrollHeight;
        await new Promise(r => setTimeout(r, 400));
        out.chatNoScrollBounce = chatBox.scrollTop === top0 && chatBox.scrollHeight === sh0;
        out.chatTestMessageAdded = document.querySelectorAll('#chat-messages .chat-msg').length === testMsgBefore + 1;
        document.getElementById('settings-close').click();
        ClipQ.ChatFeed.applySettings({ showChat: true, chatShowBadges: true, chatShowLinks: true, chatAnimation: 'slide', chatEnterMs: 350, chatDirection: 'bottom', chatHideSeconds: 0, chatHideMode: 'slide', chatExitMs: 350 });

        const invalidObsRes = await ClipQ.Sync.initObsSession('obs_key_revoked_00000000');
        out.invalidObsRejected = invalidObsRes && invalidObsRes.ok === false && invalidObsRes.invalid === true;
        const obsRes = await ClipQ.Sync.initObsSession('obs_key_beta_9876543210');
        out.obsSessionLoaded = Boolean(obsRes && obsRes.ok && obsRes.user?.displayName === 'TestStreamer' && obsRes.user?.avatar === 'https://static-cdn.jtvnw.net/obs-u1.png');
        const obsTwitchMeta = await ClipQ.Providers.getProvider('twitch').fetchMeta('GoodClip1', null);
        out.obsTwitchMetaTitle = obsTwitchMeta?.title || '';
        localStorage.setItem('clipq_video_volume', '0.42');
        localStorage.setItem('clipq_video_muted', 'true');
        ClipQ.Player.playClip({ provider: 'twitch', clipId: 'FailedTranscodeClip', url: 'https://www.twitch.tv/skuuii/clip/FailedTranscodeClip', meta: { title: 'HEVC Clip', channel: 'skuuii' } });
        await new Promise(r => setTimeout(r, 40));
        const videoEl = document.getElementById('twitch-video-player');
        out.twitchFallbackVideoSrc = videoEl?.getAttribute('src') || '';
        out.videoVolumeRestored = Boolean(videoEl && Math.abs(videoEl.volume - 0.42) < 0.01 && videoEl.muted === true);
        ClipQ.Player.playClip({ provider: 'twitch', clipId: 'NormalClip1', url: 'https://www.twitch.tv/skuuii/clip/NormalClip1', meta: { title: 'Normal Clip', channel: 'skuuii' } });
        await new Promise(r => setTimeout(r, 40));
        out.twitchNormalIframeSrc = document.querySelector('#player-area iframe')?.getAttribute('src') || '';
        ClipQ.Player.showEmpty();
        ClipQ.Auth.setActiveObsKey(null);
        await ClipQ.Sync.init({ id: '99999', login: 'teststreamer' });

        ClipQ.Settings.get().maxDurationSeconds = 30;
        const durRejectRes = ClipQ.Queue.addClip({ provider: 'twitch', clipId: 'TooLongClip1', url: 'https://clips.twitch.tv/TooLongClip1', meta: { title: 'Long Clip', channel: 'test', duration: 60 } }, 'tester');
        out.maxDurationRejected = durRejectRes === 'duration';
        ClipQ.Settings.get().maxDurationSeconds = 0;

        ClipQ.Queue.clear();
        ClipQ.Queue.setOpen(true);
        ClipQ.Queue.addClip({ provider: 'twitch', clipId: 'DeadTwitch1', url: 'https://clips.twitch.tv/DeadTwitch1', meta: { title: 'Dead TW' } }, 'u1');
        ClipQ.Queue.addClip({ provider: 'youtube', clipId: 'DeadYt1', url: 'https://youtu.be/DeadYt1', meta: { title: 'Dead YT' } }, 'u2');
        ClipQ.Queue.addClip({ provider: 'twitch', clipId: 'NormalClip1', url: 'https://clips.twitch.tv/NormalClip1', meta: { title: 'OK' } }, 'u3');
        document.getElementById('btn-next')?.click();
        await new Promise(r => setTimeout(r, 80));
        out.brokenAutoSkipped = Boolean(document.querySelector('#player-area iframe')?.getAttribute('src')?.includes('NormalClip1') && ClipQ.Queue.getItems().length === 0);
        const shareBtn = document.getElementById('btn-share-chat');
        const nextRect = document.getElementById('btn-next')?.getBoundingClientRect();
        const shareRect = shareBtn?.getBoundingClientRect();
        shareBtn?.click(); shareBtn?.click(); shareBtn?.click();
        await new Promise(r => setTimeout(r, 30));
        out.shareInChatRapidOk = Boolean(shareBtn && !shareBtn.disabled && shareRect && nextRect && shareRect.top >= nextRect.bottom && calls.chatPosts === 3);
        ClipQ.Player.showEmpty();

        document.getElementById('dropdown-settings').click();
        document.querySelector('.modal-tabs .tab[data-stab="queue"]').click();
        const qLefts = ['#stab-queue .form-label', '#stab-queue .form-hint', '.user-limit-grid > div:first-child .form-hint'].map(s => Math.round(document.querySelector(s)?.getBoundingClientRect().left || 0));
        const blkCols = Array.from(document.querySelectorAll('#stab-queue .blocked-lists-grid > div'));
        out.blockedSideBySide = blkCols.length === 2 && Math.round(blkCols[0].getBoundingClientRect().top) === Math.round(blkCols[1].getBoundingClientRect().top);
        document.getElementById('set-remove-timeout-clips').click();
        document.getElementById('set-remove-timeout-clips').click();
        document.getElementById('set-blocked-categories').value = 'Just Chatting';
        document.getElementById('set-user-clip-limit').value = '1';
        document.getElementById('set-user-clip-window').value = '24';
        document.querySelector('#set-user-clip-unit [data-unit="days"]').click();
        document.getElementById('settings-save-close').click();
        const qCfg = ClipQ.Settings.get();
        const catBlockedRes = ClipQ.Queue.addClip({ provider: 'twitch', clipId: 'CatClip1', url: 'https://clips.twitch.tv/CatClip1', meta: { title: 'Cat', category: 'Just Chatting' } }, 'catuser');
        ClipQ.Queue.addClip({ provider: 'youtube', clipId: 'WinClip1', url: 'https://youtu.be/WinClip1', meta: { title: 'W1' } }, 'winuser');
        ClipQ.Queue.start();
        ClipQ.Queue.next();
        const winLimRes = ClipQ.Queue.addClip({ provider: 'youtube', clipId: 'WinClip2', url: 'https://youtu.be/WinClip2', meta: { title: 'W2' } }, 'winuser');
        out.userWindowLimitOk = catBlockedRes === 'category' && new Set(qLefts).size === 1 && qLefts[0] > 0 && qCfg.userClipLimitWindow === 24 && qCfg.userClipLimitUnit === 'days' && qCfg.removeClipsOnTimeout === true && winLimRes === 'limit';
        qCfg.userClipLimit = 0; qCfg.userClipLimitWindow = 0; qCfg.blockedCategories = [];

        document.querySelector('.menu-tabs .tab[data-tab="history"]').click();
        const filterClick = (p) => { document.querySelector(`#history-platform-filters [data-provider="${p}"]`)?.click(); return document.querySelectorAll('#history-grid .history-item').length; };
        const twCount = filterClick('twitch'), ytCount = filterClick('youtube'), allCount = filterClick('all');
        out.historyPlatformFilterOk = twCount === 0 && ytCount === allCount && allCount >= 1;
        document.querySelector('.menu-tabs .tab[data-tab="queue"]').click();

        await ClipQ.fetchWithAuth('/api/oembed?url=https://www.youtube.com/oembed');
        ClipQ.App.setClipLimit(7);
        window.dispatchEvent(new Event('pagehide'));
        await new Promise(r => setTimeout(r, 40));

        await ClipQ.Backup.exportData();
        const importOk = await ClipQ.Backup.importData(JSON.stringify({
            config: { settings: { appTitle: 'ImportedTitle', maxDurationSeconds: 45 }, queue: { items: [], current: null } },
            history: [{ id: 'imp-1', provider: 'twitch', clipId: 'ImportedClip1', url: 'https://clips.twitch.tv/ImportedClip1', meta: { title: 'Imported Clip', channel: 'imp' }, submitters: ['alice'], playedAt: 1 }],
            memory: ['twitch:ImportedClip1'],
        }));
        out.backupImported = Boolean(importOk && ClipQ.Settings.get().appTitle === 'ImportedTitle' && ClipQ.Settings.get().maxDurationSeconds === 45 && ClipQ.Queue.getHistory().length === 1 && ClipQ.Memory.has('https://clips.twitch.tv/ImportedClip1', 'twitch', 'ImportedClip1'));
        const deleted = await ClipQ.Sync.deleteAllCloudData();
        out.deletedCloud = deleted && !ClipQ.Sync.isAvailable() && localStorage.getItem('clipq_history') === null;
        out.calls = calls;
    } finally {
        ClipQ.Auth.setActiveObsKey(null);
        document.body.classList.remove('chat-badges-hidden');
        window.fetch = origFetch;
        localStorage.removeItem('clipq_settings');
        localStorage.removeItem('clipq_history');
        localStorage.removeItem('clipq_memory');
        localStorage.removeItem('clipq_queue');
        localStorage.removeItem('clipq_autoplay');
        localStorage.removeItem('clipq_sync_owner');
        localStorage.removeItem('clipq_video_volume');
        localStorage.removeItem('clipq_video_muted');
        localStorage.setItem('clipq_language', 'en');
    }

    return out;
})()
"""


def assert_sync_report(report):
    """Assert dynamic OAuth redirect, local assets, and cloud sync (>500 history) checks passed."""
    assert report['loginRedirectMatchesOrigin'], f'OAuth redirect URI not dynamic: {report}'
    assert report['normalMenubarVisible'], f'Menubar unexpectedly hidden outside OBS mode: {report}'
    assert report['obsUrlValue'].endswith('/obs'), f'Unexpected offline OBS URL value: {report}'
    assert report['obsKeyExtractedFromPath'] == 'obs_key_alpha_1234567890', f'OBS key extraction failed: {report}'
    assert report['obsMenubarHiddenOnPath'] and report['obsDetectedOnQuery'], f'OBS mode check failed: {report}'
    assert report['obsMenubarShownWhenTopbarOn'] and report['browserMenubarAlwaysVisible'], (
        f'Show Topbar toggle behavior failed: {report}'
    )
    assert report['obsCoverInitiallyMasked'] and report['obsCoverUnmaskedOnClick'], (
        f'OBS reveal cover toggle failed: {report}'
    )
    assert report['obsCoverRemaskedOnTabLeave'] and report['obsCoverRemaskedOnClose'], (
        f'OBS reveal auto-remask failed: {report}'
    )
    assert report['noOpSaveSkippedSync'], f'No-op save unexpectedly sent sync PUT: {report}'
    assert report['purgeDefaultRoles'] == {
        'broadcaster': True,
        'leadMod': True,
        'mod': False,
        'vip': False,
        'all': False,
    }, f"Unexpected default purgememory roles: {report['purgeDefaultRoles']}"
    assert report['memoryPreservedOnHistDelete'], 'History delete/clear must preserve Clip Memory'
    assert report['localFlagsAllPresent'], f'Non-local flags detected: {report}'
    assert report['aboutPrivacyRendered'], f'About privacy section missing: {report}'
    assert report['removeExampleText'] == 'Ex: !clipq remove <URL | all | user>', report['removeExampleText']
    assert report['removedSubmitterCount'] == 0, f'removeSubmitter did not clear user clip: {report}'
    assert report['offlineDeleteCloudHidden'], f'Delete cloud button should hide offline: {report}'
    assert report['syncAvailable'] and report['loadedOver500History'], f'Cloud history >500 failed: {report}'
    assert report['oldestLoadedFirst'] and report['syncedAppTitle'] == 'SyncedTitle', report
    assert report['historyPaging'] == {'cardsBeforeMore': 200, 'loadMoreVisible': True, 'cardsAfterMore': 400}, report
    assert report['onlineDeleteCloudVisible'] and report['generalButtonsSingleRow'], report
    assert report['personalObsUrlValue'].endswith('/obs/obs_key_alpha_1234567890'), report
    assert report['regenerateObsBtnVisible'], report
    assert report['regeneratedObsUrlValue'].endswith('/obs/obs_key_beta_9876543210'), report
    assert (
        report['chatCountInitial'] == 2
        and report['chatMultiBadgeCount'] == 2
        and report['chatEmoteCount'] == 4
        and report['chatXssPrevented']
        and report['chatInvalidColorBlocked']
    ), f'Live chat feed rendering/XSS check failed: {report}'
    assert all(
        report[k]
        for k in (
            'chatBadgesHiddenClass',
            'chatUrlsStripped',
            'chatMessagesHidden',
            'chatOptionsCollapsed',
            'chatScrollbarHidden',
            'chatAutoExpired',
            'chatRow1TopAligned',
            'chatAnimDefaultsOk',
            'enterSpeedHiddenOnNone',
            'enterSpeedShownOnSlide',
            'exitSlideApplied',
            'chatTestMessageAdded',
            'chatNoScrollBounce',
            'chatRow3StableOnNone',
            'chatToggleGapCompact',
            'designColorsRowLayout',
            'videoVolumeRestored',
            'maxDurationRejected',
            'userWindowLimitOk',
            'brokenAutoSkipped',
            'blockedSideBySide',
            'shareInChatRapidOk',
            'historySearchOk',
            'historyPlatformFilterOk',
            'backupImported',
        )
    ), f'Sync/chat/queue/history feature check failed: {report}'
    assert report['chatCountAfterDeleteMsg'] == 1 and report['chatCountAfterDeleteUser'] == 0, report
    assert report['invalidObsRejected'] and report['obsSessionLoaded'], f'OBS session handling failed: {report}'
    assert report['twitchFallbackVideoSrc'].startswith(
        'https://d1ndex63qxojbr.cloudfront.net/hevc/1440/index.mp4?sig=sig123'
    ), f'Twitch failed-transcode video fallback failed: {report}'
    assert report['twitchNormalIframeSrc'].startswith('https://clips.twitch.tv/embed?clip=NormalClip1'), (
        f'Normal Twitch embed failed: {report}'
    )
    assert report['obsTwitchMetaTitle'] == 'OBS Clip Title', f'OBS Twitch meta fallback failed: {report}'
    assert report['calls']['proxyAuthOk'] and report['calls']['obsSyncOk'] and report['calls']['obsTwitchMetaOk'], (
        f'Proxy/OBS auth header check failed: {report}'
    )
    assert report['calls']['putConfig'] >= 1 and report['calls']['keepalivePut'], (
        f'pagehide keepalive config flush failed: {report}'
    )
    assert report['deletedCloud'] and report['calls']['deleteAll'] == 1, f'Cloud deletion failed: {report}'
