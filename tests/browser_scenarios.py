"""Browser JS evaluation scripts and assertions for ClipQ E2E tests."""

import json

MODAL_LANGS = ('en', 'de', 'es', 'fr', 'it', 'ja', 'pt', 'ru')


def modal_symmetry_js(lang, check_widths=True):
    """Build JS snippet checking modal geometry and tab overflow for a locale."""
    if check_widths:
        return f"""
        (() => {{
            ClipQ.I18n.setLanguage({json.dumps(lang)});
            ClipQ.I18n.applyToDOM();
            const modal = document.querySelector('#settings-overlay .modal');
            const bar = document.querySelector('.modal-tabs');
            const tabs = Array.from(document.querySelectorAll('.modal-tabs .tab'));
            const widths = [];
            for (const tab of tabs) {{
                tab.click();
                widths.push(Math.round(modal.getBoundingClientRect().width * 10) / 10);
            }}
            const br = bar.getBoundingClientRect();
            const firstR = tabs[0].getBoundingClientRect();
            const lastR = tabs[tabs.length - 1].getBoundingClientRect();
            return {{
                widths: Array.from(new Set(widths)),
                overflow: bar.scrollWidth > bar.clientWidth + 1,
                allVisible: tabs.every(t => {{
                    const r = t.getBoundingClientRect();
                    return r.left >= br.left - 0.5 && r.right <= br.right + 0.5;
                }}),
                boxGapL: Math.round((firstR.left - br.left) * 10) / 10,
                boxGapR: Math.round((br.right - lastR.right) * 10) / 10
            }};
        }})()
        """
    return f"""
    (() => {{
        ClipQ.I18n.setLanguage({json.dumps(lang)});
        ClipQ.I18n.applyToDOM();
        const modal = document.querySelector('#settings-overlay .modal');
        const bar = document.querySelector('.modal-tabs');
        const tabs = Array.from(document.querySelectorAll('.modal-tabs .tab'));
        bar.scrollLeft = 0;
        const gapL0 = Math.round((tabs[0].getBoundingClientRect().left - bar.getBoundingClientRect().left) * 10) / 10;
        bar.scrollLeft = bar.scrollWidth;
        const gapRMax = Math.round((bar.getBoundingClientRect().right - tabs[tabs.length - 1].getBoundingClientRect().right) * 10) / 10;
        bar.scrollLeft = 0;
        return {{
            modalW: Math.round(modal.getBoundingClientRect().width * 10) / 10,
            overflow: bar.scrollWidth > bar.clientWidth + 1,
            gapL0,
            gapRMax
        }};
    }})()
    """


FUNCTIONAL_TEST_JS = """
(async () => {
    const out = {};

    document.querySelector('.modal-tabs .tab[data-stab="about"]').click();
    const issueLink = document.querySelector('#stab-about a');
    out.about = {
        active: document.getElementById('stab-about').classList.contains('active'),
        href: issueLink ? issueLink.getAttribute('href') : null,
        rel: issueLink ? issueLink.getAttribute('rel') : null,
        target: issueLink ? issueLink.getAttribute('target') : null
    };

    document.querySelector('.modal-tabs .tab[data-stab="commands"]').click();
    const modBadge = document.querySelector('.cmd-roles[data-cmd="next"] .role-badge[data-role="mod"]');
    const ariaBefore = modBadge.getAttribute('aria-pressed');
    modBadge.click();
    const ariaAfter = modBadge.getAttribute('aria-pressed');
    modBadge.click();
    const prefixEl = document.getElementById('set-cmd-prefix');
    prefixEl.value = '?q';
    prefixEl.dispatchEvent(new Event('input', { bubbles: true }));
    const exText = document.getElementById('example-cmd-next').textContent;
    prefixEl.value = '!queue';
    prefixEl.dispatchEvent(new Event('input', { bubbles: true }));
    const origCmds = ClipQ.SettingsCommands.readFromUI();
    origCmds.purgememory.word = '';
    ClipQ.SettingsCommands.populateUI(origCmds);
    const emptyCmdPreserved = document.getElementById('set-cmd-purgememory').value === '';
    origCmds.purgememory.word = 'purgememory';
    ClipQ.SettingsCommands.populateUI(origCmds);
    out.commands = { ariaBefore, ariaAfter, exText, emptyCmdPreserved };

    document.querySelector('.modal-tabs .tab[data-stab="layout"]').click();
    const lockQ = document.getElementById('layout-lock-queue');
    const fcSlider = document.getElementById('layout-facecam-height');
    const qSlider = document.getElementById('layout-queue-height');
    lockQ.checked = true;
    lockQ.dispatchEvent(new Event('change', { bubbles: true }));
    const qLockedDisabled = qSlider.disabled;
    const qBefore = parseInt(qSlider.value, 10);
    fcSlider.value = '50';
    fcSlider.dispatchEvent(new Event('input', { bubbles: true }));
    const layoutNow = ClipQ.SettingsLayout.readFromUI();
    const sumHeights = layoutNow.facecamHeightPercent + layoutNow.queueHeightPercent + layoutNow.chatAdHeightPercent;
    const infoSel = document.getElementById('layout-info-position');
    infoSel.value = 'above';
    infoSel.dispatchEvent(new Event('change', { bubbles: true }));
    const gridAreas = document.getElementById('queue-view').style.gridTemplateAreas;
    const firstOrderBtn = document.querySelector('#layout-ordering-list .layout-order-btn:not(.btn-primary)');
    const orderBefore = [...layoutNow.order];
    if (firstOrderBtn) firstOrderBtn.click();
    const orderAfter = ClipQ.SettingsLayout.readFromUI().order;
    lockQ.checked = false;
    lockQ.dispatchEvent(new Event('change', { bubbles: true }));
    out.layout = {
        qLockedDisabled,
        qBefore,
        qAfter: layoutNow.queueHeightPercent,
        sumHeights,
        gridAreas,
        orderChanged: JSON.stringify(orderBefore) !== JSON.stringify(orderAfter)
    };

    const hideFc = document.getElementById('layout-hide-facecam');
    const remFc = document.getElementById('layout-remove-facecam');
    const fcArea = document.getElementById('facecam-area');
    const qSection = document.getElementById('queue-section');
    const qRectVisible = qSection.getBoundingClientRect().height;
    hideFc.click();
    const fcStyleHide = getComputedStyle(fcArea);
    const fcVisOnHide = fcStyleHide.visibility;
    const fcPointerOnHide = fcStyleHide.pointerEvents;
    const fcAriaHiddenOnHide = fcArea.getAttribute('aria-hidden');
    const fcHeightWhileHidden = fcArea.getBoundingClientRect().height;
    const qHeightWhileFcHidden = qSection.getBoundingClientRect().height;
    fcSlider.value = '55';
    fcSlider.dispatchEvent(new Event('input', { bubbles: true }));
    const fcPercentUpdatedWhileHidden = ClipQ.SettingsLayout.readFromUI().facecamHeightPercent;
    const fcInOrderingWhileHidden = Array.from(document.querySelectorAll('#layout-ordering-list .layout-order-label')).some(el => el.textContent === 'Facecam');
    remFc.click();
    const hideClearedByRemove = !hideFc.classList.contains('active') && remFc.classList.contains('active');
    const fcDisplayRemoved = fcArea.style.display;
    const fcInOrderingRemoved = Array.from(document.querySelectorAll('#layout-ordering-list .layout-order-label')).some(el => el.textContent === 'Facecam');
    remFc.click();
    out.layoutVisibility = {
        fcVisOnHide,
        fcPointerOnHide,
        fcAriaHiddenOnHide,
        fcHeightPositive: fcHeightWhileHidden > 0,
        qDeltaOnHide: Math.round(Math.abs(qHeightWhileFcHidden - qRectVisible)),
        fcPercentUpdatedWhileHidden,
        fcInOrderingWhileHidden,
        hideClearedByRemove,
        fcDisplayRemoved,
        fcInOrderingRemoved
    };

    document.querySelector('.modal-tabs .tab[data-stab="design"]').click();
    document.querySelector('#stab-design .color-swatch[data-var="--color-accent"]').click();
    const pickerOpen = !!document.querySelector('.color-picker-popup');
    const hexInput = document.querySelector('.color-picker-popup .cp-hex');
    const alphaRange = document.querySelector('.cp-alpha-row input[type="range"]');
    const alphaAppearance = alphaRange ? getComputedStyle(alphaRange).appearance : null;
    const origInlineAccent = document.documentElement.style.getPropertyValue('--color-accent');
    if (hexInput) {
        hexInput.value = '#11aa22';
        hexInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const previewAccent = document.documentElement.style.getPropertyValue('--color-accent').trim();
    document.getElementById('settings-cancel').click();
    const modalClosedAfterCancel = document.getElementById('settings-overlay').classList.contains('hidden');
    const revertedAccent = document.documentElement.style.getPropertyValue('--color-accent').trim();
    out.design = { pickerOpen, alphaAppearance, previewAccent, origInlineAccent, revertedAccent, modalClosedAfterCancel };

    document.getElementById('user-menu-toggle').click();
    document.getElementById('dropdown-settings').click();
    document.getElementById('set-language').value = 'de';
    document.getElementById('settings-save-close').click();
    const langAfterSaveDe = document.documentElement.lang;
    document.getElementById('user-menu-toggle').click();
    document.getElementById('dropdown-settings').click();
    document.getElementById('set-language').value = 'en';
    document.getElementById('settings-save-close').click();
    const langAfterSaveEn = document.documentElement.lang;
    out.settingsLangSave = { langAfterSaveDe, langAfterSaveEn };

    ClipQ.Queue.clear();
    ClipQ.Queue.clearHistory();
    ClipQ.Memory.purge();
    ClipQ.Queue.setOpen(true);

    const emptyQueueEl = document.querySelector('#queue-list .queue-empty');
    const emptyQueueBrRendered = !!(emptyQueueEl && emptyQueueEl.querySelector('br') && !emptyQueueEl.textContent.includes('<br>'));

    const cfg = ClipQ.Settings.get();
    cfg.userClipLimit = 2;
    cfg.ageLimitDays = 7;
    cfg.providers = { twitch: true, twitch_vod: true, youtube: true, tiktok: true, instagram: true };
    ClipQ.Settings.save(cfg);

    const makeClip = (clipId, title, isPushed, daysAgo) => {
        const createdAt = daysAgo ? new Date(Date.now() - daysAgo * 86400000).toISOString() : new Date().toISOString();
        return {
            provider: 'youtube',
            clipId,
            url: 'https://youtu.be/' + clipId,
            embedUrl: 'https://www.youtube.com/embed/' + clipId,
            isPushed: !!isPushed,
            meta: { title, channel: 'Chan', createdAt, thumbnail: '' }
        };
    };
    const makeUser = (name, opts) => ({
        name,
        login: name.toLowerCase(),
        isMod: !!(opts && opts.isMod),
        isLeadMod: !!(opts && opts.isLeadMod),
        isVip: !!(opts && opts.isVip),
        isBroadcaster: !!(opts && opts.isBroadcaster),
        msgId: (opts && opts.msgId) || null
    });

    const r1 = ClipQ.Queue.addClip(makeClip('aaaaaaaaaaa', '<script>alert(1)<\\/script>', false), makeUser('viewer1', { msgId: 'msg1' }));
    const r2 = ClipQ.Queue.addClip(makeClip('bbbbbbbbbbb', 'Mod Push', true), makeUser('mod1', { isMod: true, msgId: 'msg2' }));
    const r3 = ClipQ.Queue.addClip(makeClip('ccccccccccc', 'Broadcaster Push', true), makeUser('streamer', { isBroadcaster: true, msgId: 'msg3' }));
    const r4 = ClipQ.Queue.addClip(makeClip('ddddddddddd', 'LeadMod Push', true), makeUser('lead1', { isLeadMod: true, msgId: 'msg4' }));
    const orderPriorities = ClipQ.Queue.getItems().map(c => c.clipId + ':' + c.priority);

    const rBlockedUser = ClipQ.Queue.addClip(makeClip('blk11111111', 'Bot Clip', false), makeUser('nightbot', { msgId: 'msg_blk' }));
    const rTooOld = ClipQ.Queue.addClip(makeClip('old11111111', 'Old Clip', false, 10), makeUser('viewer3', { msgId: 'msg_old' }));
    const rLim2 = ClipQ.Queue.addClip(makeClip('eeeeeeeeeee', 'V1 2nd', false), makeUser('viewer1', { msgId: 'msg5' }));
    const rLim3 = ClipQ.Queue.addClip(makeClip('fffffffffff', 'V1 3rd', false), makeUser('viewer1', { msgId: 'msg6' }));
    const rDup = ClipQ.Queue.addClip(makeClip('bbbbbbbbbbb', 'Dup', false), makeUser('viewer2', { msgId: 'msg7' }));
    const modItemAfterDup = ClipQ.Queue.getItems().find(c => c.clipId === 'bbbbbbbbbbb');

    const hasRawScript = document.getElementById('queue-list').querySelector('script') !== null;
    const escapedTextPresent = document.getElementById('queue-list').textContent.includes('<script>alert(1)');

    const started = ClipQ.Queue.start();
    const played = ClipQ.Queue.next();
    const historyAfterNext = ClipQ.Queue.getHistory().length;
    const memoryHasStarted = ClipQ.Memory.has('https://youtu.be/' + started.clipId, 'youtube', started.clipId);
    const rMemViewer = ClipQ.Queue.addClip(makeClip(started.clipId, 'Re-add Viewer', false), makeUser('viewer2', { msgId: 'msg8' }));
    const rMemLeadMod = ClipQ.Queue.addClip(makeClip(started.clipId, 'Re-add LeadMod', false), makeUser('lead2', { isLeadMod: true, msgId: 'msg9' }));

    const countBeforeRem = ClipQ.Queue.getItems().length;
    ClipQ.Queue.removeByMsgId('msg5');
    const countAfterRemMsg = ClipQ.Queue.getItems().length;
    ClipQ.Queue.removeOwnClipByUrl('https://youtu.be/' + started.clipId, 'lead2');
    const countAfterRemOwn = ClipQ.Queue.getItems().length;
    const prevClip = ClipQ.Queue.previousFromHistory();
    const prevAtStart = ClipQ.Queue.previousFromHistory();
    const clearedPlayback = ClipQ.Queue.clearHistory();
    const nextAfterClearHist = ClipQ.Queue.next();

    ClipQ.Queue.clear();
    ClipQ.Queue.addClip(makeClip('g1111111111', 'Click Play Test', false), makeUser('viewer4', { msgId: 'msg10' }));
    ClipQ.Queue.addClip(makeClip('h1111111111', 'Delete Test', false), makeUser('viewer4', { msgId: 'msg11' }));
    ClipQ.App.setAutoplay(true);
    document.querySelector('#queue-list .queue-item')?.click();
    const playedViaDelegate = ClipQ.Player.getCurrent()?.clipId || null;
    ClipQ.App.setAutoplay(false);
    document.querySelector('#queue-list .queue-item-delete')?.click();
    const countAfterDelegatedDelete = ClipQ.Queue.getItems().length;

    ClipQ.Queue.clear();
    ClipQ.Queue.clearHistory();
    const allProv = { twitch: true, twitch_vod: true, youtube: true, tiktok: true, instagram: true };
    const dirtyTwitchChannel = ClipQ.Providers.parseClipUrl('https://www.twitch.tv/mychan/clip/SomeCoolClip"du?range=7d', allProv);
    const dirtyClipsHost = ClipQ.Providers.parseClipUrl('https://clips.twitch.tv/AnotherSlug?filter=clips&range=7d', allProv);
    const createClipsHost = ClipQ.Providers.parseClipUrl('https://clips.twitch.tv/create/SomeCoolClip?range=7d', allProv);
    const bareCreateUrl = ClipQ.Providers.parseClipUrl('https://clips.twitch.tv/create', allProv);
    const embedClipsUrl = ClipQ.Providers.parseClipUrl('https://clips.twitch.tv/embed?clip=SomeCoolClip', allProv);
    const tiktokEmbed = ClipQ.Providers.getProvider('tiktok').getEmbedUrl('6718335390845095173');
    const langScheme = getComputedStyle(document.getElementById('set-language')).colorScheme;

    ClipQ.Queue.addClip({
        provider: 'twitch',
        clipId: createClipsHost.id,
        url: createClipsHost.url,
        meta: { title: 'Create Slug Clip', channel: 'mychan', thumbnail: '' }
    }, makeUser('viewer7', { msgId: 'msg14' }));
    ClipQ.Queue.addClip({
        provider: 'twitch',
        clipId: dirtyTwitchChannel.id,
        url: dirtyTwitchChannel.url,
        meta: { title: 'Create Slug Clip', channel: 'mychan', thumbnail: '' }
    }, makeUser('viewer8', { msgId: 'msg15' }));
    const twitchDedupCount = ClipQ.Queue.getItems().length;
    const twitchQueueThumbIsLogo = !!document.querySelector('#queue-list img.queue-thumb.platform-logo');
    const twitchQueueHasPlaceholder = !!document.querySelector('#queue-list .clip-placeholder');
    const iconBadge = document.querySelector('#queue-list .queue-provider-icon');
    const delBtn = document.querySelector('#queue-list .queue-item-delete');
    const iconStyle = iconBadge ? getComputedStyle(iconBadge) : null;
    const delStyle = delBtn ? getComputedStyle(delBtn) : null;
    const iconTopLeftTransparent = iconStyle
        ? (iconStyle.top === '4px' && iconStyle.left === '4px' && iconStyle.backgroundColor === 'rgba(0, 0, 0, 0)')
        : false;
    const delSolidBg = delStyle
        ? (delStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' && !delStyle.backgroundColor.includes('0.1)') && delStyle.color === 'rgb(255, 255, 255)')
        : false;
    ClipQ.Queue.clear();
    const tiktokChan = ClipQ.Providers.getProvider('tiktok').extractChannel('https://www.tiktok.com/@HandOfBlood/video/7707614806802550048');
    ClipQ.Queue.addClip({ provider: 'tiktok', clipId: '7707614806802550048', url: 'https://www.tiktok.com/@HandOfBlood/video/7707614806802550048', meta: { title: 'TT', channel: 'TikTok', authorUrl: '', thumbnail: '' } }, makeUser('viewer9', { msgId: 'msg16' }));
    const tiktokQueueThumbIsLogo = !!document.querySelector('#queue-list img.queue-thumb.platform-logo') && !document.querySelector('#queue-list .clip-placeholder');
    ClipQ.Player.playClip({ provider: 'tiktok', clipId: '7707614806802550048', url: 'https://vm.tiktok.com/ZNR12345/', meta: { title: 'TT', channel: 'TikTok', authorUrl: '' } });
    const badTtHref = document.querySelector('#clip-details a')?.getAttribute('href') || null;
    ClipQ.Player.playClip({ provider: 'tiktok', clipId: '7707614806802550048', url: 'https://www.tiktok.com/@handofblood/video/7707614806802550048', meta: { title: 'TT', channel: 'HandOfBlood', authorUrl: 'https://www.tiktok.com/@handofblood' } });
    const goodTtHref = document.querySelector('#clip-details a')?.getAttribute('href') || null;
    const igParsedHandle = ClipQ.Providers.parseClipUrl('https://www.instagram.com/ausconservation/reel/DfItNRUiKTV/?xtok=1', allProv);
    const playIgHref = (url) => {
        ClipQ.Player.playClip({ provider: 'instagram', clipId: 'DfItNRUiKTV', url, meta: { title: 'Instagram Reel', channel: 'Instagram', authorUrl: '', directUrl: 'about:blank', directUrlFetchedAt: Date.now() } });
        return document.querySelector('#clip-details a')?.getAttribute('href') || null;
    };
    const igHrefDisplayOnly = {
        igResolved: ClipQ.Providers.resolveInstagramAuthor({ uploader: 'Australian Conservation Foundation', channel: 'ausconservation' }),
        igBad: ClipQ.Providers.resolveInstagramAuthor({ uploader: 'Australian Conservation Foundation', channel: '' }),
        igChan: igParsedHandle?.channelName || null,
        igCanon: igParsedHandle?.url || null,
        igClipFallbackHref: playIgHref('https://www.instagram.com/reel/DfItNRUiKTV/'),
        igUrlHandleHref: playIgHref('https://www.instagram.com/ausconservation/reel/DfItNRUiKTV/')
    };
    ClipQ.Queue.clear();
    ClipQ.Queue.clearHistory();
    ClipQ.Queue.addClip(makeClip('dead1111111', 'Dead Clip', false), makeUser('viewer9', { msgId: 'msg17' }));
    ClipQ.Queue.addClip(makeClip('live2222222', 'Live Clip', false), makeUser('viewer9', { msgId: 'msg18' }));
    ClipQ.Queue.start();
    ClipQ.App.skipUnavailableClip();
    const skipHistLen = ClipQ.Queue.getHistory().length;
    const skipCurrentId = ClipQ.Player.getCurrent()?.clipId || null;
    ClipQ.Player.showEmpty();
    ClipQ.Queue.clear();
    ClipQ.Queue.clearHistory();

    ClipQ.Queue.addClip(makeClip('hist1111111', 'First Hist Clip', false), makeUser('viewer6', { msgId: 'msg13' }));
    ClipQ.Queue.addClip({
        provider: 'twitch',
        clipId: 'LegacyClipSlug',
        url: 'https://www.twitch.tv/mychan/clip/LegacyClipSlug"du?range=7d',
        meta: { title: 'du bist awesome', channel: 'mychan' }
    }, makeUser('viewer5', { msgId: 'msg12' }));
    ClipQ.Queue.start();
    ClipQ.Queue.next();
    ClipQ.Queue.next();
    document.querySelector('.menu-tabs .tab[data-tab="history"]').click();
    const histLinkHref = document.querySelector('#history-grid .history-item-link')?.getAttribute('href') || null;
    const histCountBeforeCancel = document.querySelectorAll('#history-grid .history-item').length;
    document.querySelector('#history-grid .history-item-delete').click();
    await new Promise(r => setTimeout(r, 20));
    const confirmVisible = !!document.querySelector('.confirm-modal-body');
    document.querySelector('.confirm-cancel-btn').click();
    await new Promise(r => setTimeout(r, 20));
    const histCountAfterCancel = document.querySelectorAll('#history-grid .history-item').length;
    document.querySelector('#history-grid .history-item-delete').click();
    await new Promise(r => setTimeout(r, 20));
    document.querySelector('.confirm-yes-btn').click();
    await new Promise(r => setTimeout(r, 20));
    const histCountAfterConfirm = document.querySelectorAll('#history-grid .history-item').length;
    ClipQ.Queue.previousFromHistory();
    document.querySelector('#history-grid .history-item-delete').click();
    await new Promise(r => setTimeout(r, 20));
    document.querySelector('.confirm-yes-btn').click();
    await new Promise(r => setTimeout(r, 20));
    const clearedPlayerAfterDel = ClipQ.Player.getCurrent() === null;
    document.querySelector('.menu-tabs .tab[data-tab="queue"]').click();

    out.historyAndCanonical = {
        dirtyTwitchChannelUrl: dirtyTwitchChannel?.url || null,
        dirtyClipsHostUrl: dirtyClipsHost?.url || null,
        createClipsHostId: createClipsHost?.id || null,
        createClipsHostUrl: createClipsHost?.url || null,
        bareCreateRejected: bareCreateUrl === null && embedClipsUrl === null,
        tiktokEmbed, langScheme, twitchDedupCount, twitchQueueThumbIsLogo, twitchQueueHasPlaceholder,
        iconTopLeftTransparent, delSolidBg, tiktokChan, tiktokQueueThumbIsLogo, badTtHref, goodTtHref, igHrefDisplayOnly,
        skipHistLen, skipCurrentId, histLinkHref, histCountBeforeCancel, confirmVisible,
        histCountAfterCancel, histCountAfterConfirm, clearedPlayerAfterDel
    };

    out.queueAndApp = {
        addedFlags: [r1, r2, r3, r4],
        orderPriorities,
        rBlockedUser,
        rTooOld,
        userLimit: { second: rLim2, third: rLim3 },
        rDup,
        dupPushCount: modItemAfterDup ? modItemAfterDup.pushCount : null,
        xssSafe: !hasRawScript && escapedTextPresent,
        historyAfterNext,
        memoryHasStarted,
        rMemViewer,
        rMemLeadMod,
        removals: { countBeforeRem, countAfterRemMsg, countAfterRemOwn },
        prevClipId: prevClip ? prevClip.clipId : null,
        prevAtStart,
        clearedPlayback,
        nextAfterClearHist: nextAfterClearHist ? nextAfterClearHist.clipId : null,
        playedViaDelegate,
        countAfterDelegatedDelete,
        emptyQueueBrRendered
    };

    out.runtimeErrors = window.__cdpErrors;
    return out;
})()
"""


def assert_modal_report(modal_report):
    """Assert symmetric tab padding and clean responsive overflow behavior."""
    for key, res in modal_report.items():
        if key.startswith(('1366x768_', '1920x1080_')):
            assert not res['overflow'], f'{key}: unexpected tab overflow {res}'
            if 'widths' in res:
                assert len(res['widths']) == 1, f'{key}: modal width changed across tabs: {res}'
                assert res['allVisible'], f'{key}: not all tabs visible: {res}'
                assert abs(res['boxGapL'] - res['boxGapR']) <= 0.5, f'{key}: asymmetric gaps {res}'
        elif key.startswith('700x768_'):
            assert res['overflow'], f'{key}: expected horizontal scroll at 700px width'
            assert res['gapL0'] >= 17.0 and res['gapRMax'] >= 17.0, f'{key}: scroll gaps broken {res}'


def assert_functional_report(report):
    """Assert all UI, settings, layout, queue, history, and runtime-error checks passed."""
    assert not report['runtimeErrors'], f"JS runtime errors: {report['runtimeErrors']}"
    assert report['about']['active'] and report['about']['rel'] == 'noopener noreferrer'
    assert report['commands']['ariaBefore'] == 'true' and report['commands']['ariaAfter'] == 'false'
    assert report['commands']['exText'] == 'Ex: ?q next', f"Unexpected exText: {report['commands']}"
    assert report['commands']['emptyCmdPreserved'], 'Empty command word was not preserved'
    assert report['layout']['qLockedDisabled'] and report['layout']['qBefore'] == report['layout']['qAfter']
    assert report['layout']['sumHeights'] == 100 and report['layout']['orderChanged']

    vis = report['layoutVisibility']
    assert vis['fcVisOnHide'] == 'hidden' and vis['fcPointerOnHide'] == 'none'
    assert vis['fcAriaHiddenOnHide'] == 'true' and vis['fcHeightPositive']
    assert vis['qDeltaOnHide'] == 0 and vis['fcPercentUpdatedWhileHidden'] == 55
    assert vis['fcInOrderingWhileHidden'] and vis['hideClearedByRemove']
    assert vis['fcDisplayRemoved'] == 'none' and not vis['fcInOrderingRemoved']

    des = report['design']
    assert des['pickerOpen'] and des['alphaAppearance'] == 'none', f'ColorPicker/range check failed: {des}'
    assert des['previewAccent'] == 'rgba(17,170,34,1)' and des['modalClosedAfterCancel'], (
        f'Design preview failed: {des}'
    )
    assert des['revertedAccent'] == des['origInlineAccent'], f'Design cancel revert failed: {des}'

    assert report['settingsLangSave'] == {'langAfterSaveDe': 'de', 'langAfterSaveEn': 'en'}

    hc = report['historyAndCanonical']
    assert hc['dirtyTwitchChannelUrl'] == 'https://www.twitch.tv/mychan/clip/SomeCoolClip'
    assert hc['dirtyClipsHostUrl'] == 'https://clips.twitch.tv/AnotherSlug'
    assert hc['createClipsHostId'] == 'SomeCoolClip'
    assert hc['createClipsHostUrl'] == 'https://clips.twitch.tv/SomeCoolClip'
    assert hc['bareCreateRejected'], f'Invalid clips.twitch paths were not rejected: {hc}'
    assert hc['tiktokEmbed'].startswith('https://www.tiktok.com/player/v1/6718335390845095173'), hc['tiktokEmbed']
    assert hc['langScheme'] == 'dark', f"Unexpected #set-language color-scheme: {hc['langScheme']}"
    assert hc['twitchDedupCount'] == 1, f'Expected /create/ + channel URL dedup to 1 item: {hc}'
    assert hc['twitchQueueThumbIsLogo'] and not hc['twitchQueueHasPlaceholder'], (
        f'Twitch fallback logo check failed: {hc}'
    )
    assert hc['iconTopLeftTransparent'], f'Provider icon positioning/background failed: {hc}'
    assert hc['delSolidBg'], f'Queue delete button solid fill check failed: {hc}'
    assert hc['tiktokChan'] == 'handofblood' and hc['tiktokQueueThumbIsLogo'], f'TikTok queue/handle failed: {hc}'
    assert (
        hc['badTtHref'] == 'https://vm.tiktok.com/ZNR12345'
        and hc['goodTtHref'] == 'https://www.tiktok.com/@handofblood'
    ), hc
    assert hc['igHrefDisplayOnly'] == {
        'igResolved': 'https://www.instagram.com/ausconservation/',
        'igBad': '',
        'igChan': 'ausconservation',
        'igCanon': 'https://www.instagram.com/ausconservation/reel/DfItNRUiKTV/',
        'igClipFallbackHref': 'https://www.instagram.com/reel/DfItNRUiKTV/',
        'igUrlHandleHref': 'https://www.instagram.com/ausconservation/',
    }, hc
    assert hc['skipHistLen'] == 0 and hc['skipCurrentId'] == 'live2222222', f'Unavailable skip archived clip: {hc}'
    assert hc['histLinkHref'] == 'https://www.twitch.tv/mychan/clip/LegacyClipSlug'
    assert hc['confirmVisible'] and hc['histCountBeforeCancel'] == hc['histCountAfterCancel']
    assert hc['histCountAfterConfirm'] == hc['histCountAfterCancel'] - 1 and hc['clearedPlayerAfterDel']

    qa = report['queueAndApp']
    assert qa['addedFlags'] == ['added', 'added', 'added', 'added'], f"Unexpected add flags: {qa['addedFlags']}"
    assert qa['rBlockedUser'] == 'blocked', f"Expected blocked user: {qa['rBlockedUser']}"
    assert qa['rTooOld'] == 'age', f"Expected age rejection: {qa['rTooOld']}"
    assert qa['userLimit'] == {'second': 'added', 'third': 'limit'}, f"User limit check failed: {qa['userLimit']}"
    assert qa['rDup'] == 'added' and qa['dupPushCount'] == 2, f"Duplicate push check failed: {qa}"
    assert qa['xssSafe'] and qa['emptyQueueBrRendered'], f"XSS/empty queue check failed: {qa}"
    assert qa['memoryHasStarted'] and qa['rMemViewer'] == 'memory' and qa['rMemLeadMod'] == 'added', (
        f"Memory bypass failed: {qa}"
    )
    assert qa['removals']['countAfterRemMsg'] == qa['removals']['countBeforeRem'] - 1, (
        f"msgId remove failed: {qa['removals']}"
    )
    assert qa['removals']['countAfterRemOwn'] == qa['removals']['countAfterRemMsg'] - 1, (
        f"own URL remove failed: {qa['removals']}"
    )
    assert qa['prevClipId'] == 'ccccccccccc' and qa['prevAtStart'] is None, f"History prev check failed: {qa}"
    assert qa['clearedPlayback'] and qa['nextAfterClearHist'] == 'ddddddddddd', f"Clear history check failed: {qa}"
    assert qa['playedViaDelegate'] == 'g1111111111' and qa['countAfterDelegatedDelete'] == 0, (
        f"Delegated click/del failed: {qa}"
    )
