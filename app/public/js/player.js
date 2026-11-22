/**
 * player.js — Clip player embed and info display
 * Supports: i18n, XSS-safe rendering, responsive vertical embeds, and Twitch VOD duration parsing.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Player = (() => {
    'use strict';

    let currentClip = null;
    let playTimeout = null;
    let autoplayDeadline = 0;
    let remainingAutoplayMs = 0;
    let paused = false;
    let tiktokUnmutePending = false;
    const t = (key, params) => ClipQ.I18n.t(key, params);
    const esc = (val) => ClipQ.escapeHtml(val);
    const safeUrl = (val) => ClipQ.sanitizeUrl(val);

    const DIRECT_URL_MAX_AGE_MS = 5 * 60 * 1000;
    const VIDEO_VOLUME_KEY = 'clipq_video_volume';
    const VIDEO_MUTED_KEY = 'clipq_video_muted';
    const TWITCH_GQL_URL = 'https://gql.twitch.tv/gql';
    const TWITCH_GQL_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

    function formatAge(dateStr) {
        if (!dateStr) return '';
        const timestamp = new Date(dateStr).getTime();
        if (Number.isNaN(timestamp)) return '';

        const mins = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
        const plural = (n, sKey, pKey) => t(n === 1 ? sKey : pKey, { count: n });
        if (mins < 60) return t('time.minutes_ago', { count: mins });
        const hours = Math.floor(mins / 60);
        if (hours < 24) return t('time.hours_ago', { count: hours });
        const days = Math.floor(hours / 24);
        if (days < 7) return plural(days, 'time.day_ago', 'time.days_ago');
        if (days < 30) return plural(Math.floor(days / 7), 'time.week_ago', 'time.weeks_ago');
        if (days < 365) return plural(Math.floor(days / 30), 'time.month_ago', 'time.months_ago');
        return plural(Math.floor(days / 365), 'time.year_ago', 'time.years_ago');
    }

    function getChannelUrl(channelName, provider, meta = {}, clipUrl = '') {
        if (provider === 'instagram') {
            return ClipQ.Providers?.resolveInstagramAuthor?.(
                { title: meta.title, channel: channelName },
                meta.authorUrl,
                clipUrl
            ) || '';
        }
        if (meta.authorUrl) {
            const safeAuthor = safeUrl(meta.authorUrl);
            if (safeAuthor) return safeAuthor;
        }
        if (!channelName) return '';
        if (provider === 'twitch' || provider === 'twitch_vod') {
            return `https://www.twitch.tv/${encodeURIComponent(channelName)}`;
        }
        if (provider === 'youtube') {
            return `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}`;
        }
        if (provider === 'tiktok') {
            const handle = channelName.replace(/^@/, '').trim();
            if (!handle || handle.toLowerCase() === 'tiktok' || /\s/.test(handle)) return '';
            return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
        }
        return '';
    }

    function syncPlaybackButtons() {
        if (ClipQ.App && ClipQ.App.updateNextButton) ClipQ.App.updateNextButton();
    }

    function skipUnavailableOrEmpty() {
        if (ClipQ.App && ClipQ.App.skipUnavailableClip) ClipQ.App.skipUnavailableClip();
        else showEmpty();
    }

    function renderVerticalIframe(playerArea, embedUrl, extraClass = '') {
        const cleanEmbed = safeUrl(embedUrl);
        if (!cleanEmbed) {
            skipUnavailableOrEmpty();
            return;
        }
        const wrapClass = extraClass ? `vertical-embed-wrap ${esc(extraClass)}` : 'vertical-embed-wrap';
        playerArea.innerHTML = `
        <div class="${wrapClass}">
            <iframe
                src="${esc(cleanEmbed)}"
                scrolling="no"
                allowfullscreen
                allow="autoplay; encrypted-media; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            ></iframe>
        </div>`;
    }

    function renderEmbedIframe(playerArea, embedUrl, isVertical = false, extraClass = '') {
        if (isVertical) {
            renderVerticalIframe(playerArea, embedUrl, extraClass);
            return;
        }
        playerArea.innerHTML = `<iframe
            src="${esc(embedUrl)}"
            allowfullscreen
            allow="autoplay; encrypted-media"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        ></iframe>`;
    }

    function renderDirectVideo(playerArea, videoUrl, videoId, clip, onErrorFallback) {
        const cleanVideoUrl = safeUrl(videoUrl);
        if (!cleanVideoUrl) {
            onErrorFallback();
            return;
        }

        playerArea.innerHTML = `
        <div class="direct-video-wrap">
            <video
                id="${esc(videoId)}"
                src="${esc(cleanVideoUrl)}"
                autoplay
                controls
                playsinline
            ></video>
        </div>`;

        const videoEl = document.getElementById(videoId);
        if (videoEl) {
            try {
                const savedVol = Number.parseFloat(localStorage.getItem(VIDEO_VOLUME_KEY) || '');
                if (Number.isFinite(savedVol) && savedVol >= 0 && savedVol <= 1) videoEl.volume = savedVol;
                const savedMuted = localStorage.getItem(VIDEO_MUTED_KEY);
                if (savedMuted === 'true' || savedMuted === 'false') videoEl.muted = savedMuted === 'true';
            } catch { /* ignore storage errors */ }
            videoEl.addEventListener('volumechange', () => {
                try {
                    localStorage.setItem(VIDEO_VOLUME_KEY, String(videoEl.volume));
                    localStorage.setItem(VIDEO_MUTED_KEY, String(Boolean(videoEl.muted)));
                } catch { /* ignore storage quota errors */ }
            });
            videoEl.addEventListener('ended', () => {
                if (ClipQ.App.isAutoplay() && currentClip === clip) {
                    ClipQ.App.nextClip();
                }
            });
            videoEl.addEventListener('pause', () => {
                if (currentClip === clip && !videoEl.ended) setPausedState(true);
            });
            videoEl.addEventListener('play', () => {
                if (currentClip === clip) setPausedState(false);
            });
            videoEl.addEventListener('error', (e) => {
                console.warn(`HTML5 video playback error (${videoId}), falling back to iframe`, e);
                if (currentClip === clip) onErrorFallback();
            });
        }
    }

    async function resolveTwitchFallbackVideoUrl(clipId) {
        if (!clipId || !/^[A-Za-z0-9_-]{1,128}$/.test(clipId)) return null;
        try {
            const resp = await fetch(TWITCH_GQL_URL, {
                method: 'POST',
                headers: { 'Client-ID': TWITCH_GQL_CLIENT_ID, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'query($slug:ID!){clip(slug:$slug){assets{creationState} playbackAccessToken(params:{platform:"web",playerType:"embed"}){signature value} videoQualities{quality sourceURL}}}',
                    variables: { slug: clipId }
                }),
                signal: AbortSignal.timeout(4000)
            });
            if (!resp.ok) return null;
            const payload = await resp.json();
            const clipData = payload?.data?.clip;
            if (!clipData) {
                return payload?.data && payload.data.clip === null ? { unavailable: true } : null;
            }

            const assets = Array.isArray(clipData.assets) ? clipData.assets : [];
            const transcodesFailed = assets.length > 0 && assets.every(a => a?.creationState === 'FAILED');
            const qualities = Array.isArray(clipData.videoQualities) ? clipData.videoQualities : [];
            const sig = clipData.playbackAccessToken?.signature;
            const rawToken = clipData.playbackAccessToken?.value;
            if (!sig || !rawToken) return null;

            let clipUri = '';
            try { clipUri = JSON.parse(rawToken)?.clip_uri || ''; } catch { clipUri = ''; }
            const isHevcSource = typeof clipUri === 'string' && /\/hevc\//i.test(clipUri);
            const rawSource = (transcodesFailed || qualities.length === 0 || isHevcSource)
                ? (clipUri || qualities[0]?.sourceURL || '')
                : (qualities[0]?.sourceURL || clipUri || '');
            const safeBase = safeUrl(rawSource);
            if (!safeBase) return null;
            return { url: `${safeBase}?sig=${encodeURIComponent(sig)}&token=${encodeURIComponent(rawToken)}` };
        } catch {
            return null;
        }
    }

    function renderInstagramVideo(playerArea, videoUrl, provider, clip) {
        renderDirectVideo(playerArea, videoUrl, 'instagram-video-player', clip, () => {
            renderVerticalIframe(playerArea, provider.getEmbedUrl(clip.clipId, clip.url), 'instagram-embed-wrap');
            startAutoplayTimeout(clip);
        });
    }

    function sendTiktokCommand(type, value = null) {
        const iframe = document.querySelector('#player-area iframe');
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage({ 'x-tiktok-player': true, type, value }, 'https://www.tiktok.com');
        }
    }

    window.addEventListener('message', (event) => {
        if (event.origin !== 'https://www.tiktok.com') return;
        const data = event.data;
        if (!data || !data['x-tiktok-player'] || !currentClip || currentClip.provider !== 'tiktok') return;

        if (tiktokUnmutePending && (data.type === 'onPlayerReady' || (data.type === 'onMute' && data.value === true))) {
            sendTiktokCommand('unMute');
            sendTiktokCommand('setVolume', 100);
        } else if (data.type === 'onMute' && data.value === false) {
            tiktokUnmutePending = false;
        }

        if (data.type === 'onStateChange' && data.value === 1) {
            if (tiktokUnmutePending) {
                sendTiktokCommand('unMute');
                sendTiktokCommand('setVolume', 100);
                tiktokUnmutePending = false;
            }
            setPausedState(false);
        } else if (data.type === 'onStateChange' && data.value === 2) {
            setPausedState(true);
        } else if (data.type === 'onStateChange' && data.value === 0 && ClipQ.App.isAutoplay()) {
            ClipQ.App.nextClip();
        }
    });

    function playClip(clip) {
        if (!clip) { showEmpty(); return; }
        currentClip = clip;
        paused = false;
        remainingAutoplayMs = 0;
        autoplayDeadline = 0;
        tiktokUnmutePending = clip.provider === 'tiktok';
        clearAutoplayTimeout();
        syncPlaybackButtons();

        const playerArea = document.getElementById('player-area');
        if (!playerArea) return;
        const provider = ClipQ.Providers.getProvider(clip.provider);
        if (!provider) { skipUnavailableOrEmpty(); return; }

        if (clip.provider === 'instagram') {
            updateInfo(clip);

            const cachedUrl = clip.meta?.directUrl;
            const cachedAt = clip.meta?.directUrlFetchedAt || 0;
            if (cachedUrl && (Date.now() - cachedAt) < DIRECT_URL_MAX_AGE_MS) {
                renderInstagramVideo(playerArea, cachedUrl, provider, clip);
                return;
            }

            playerArea.innerHTML = `<div class="player-loading"><div class="player-empty-icon">⏳</div><div class="player-loading-text">${esc(t('player.loading_instagram'))}</div></div>`;

            ClipQ.fetchWithAuth(`/api/video-url?url=${encodeURIComponent(clip.url)}`)
                .then(res => {
                    if (!res.ok) throw new Error('API request failed');
                    return res.json();
                })
                .then(data => {
                    if (!data.url) throw new Error('No video URL returned');
                    if (currentClip !== clip) return;

                    if (data.duration) clip.meta.duration = ClipQ.Providers.parseDurationSeconds(data.duration);
                    if (data.title && (!clip.meta.title || clip.meta.title === 'Instagram Reel')) {
                        clip.meta.title = data.title;
                    }
                    const igDisplay = data.uploader || data.channel;
                    if (igDisplay && (!clip.meta.channel || clip.meta.channel === 'Instagram')) {
                        clip.meta.channel = igDisplay;
                        clip.meta.creator = igDisplay;
                    }
                    const igAuthorUrl = ClipQ.Providers.resolveInstagramAuthor?.(data, clip.meta.authorUrl, clip.url);
                    if (igAuthorUrl) clip.meta.authorUrl = igAuthorUrl;
                    clip.meta.directUrl = data.url;
                    clip.meta.directUrlFetchedAt = Date.now();
                    updateInfo(clip);

                    renderInstagramVideo(playerArea, data.url, provider, clip);
                })
                .catch(err => {
                    console.warn('Could not fetch direct Instagram video URL, falling back to iframe', err);
                    if (currentClip !== clip) return;

                    renderVerticalIframe(playerArea, provider.getEmbedUrl(clip.clipId, clip.url), 'instagram-embed-wrap');
                    startAutoplayTimeout(clip);
                });
            return;
        }

        const embedUrl = safeUrl(provider.getEmbedUrl(clip.clipId, clip.url));
        if (!embedUrl) { skipUnavailableOrEmpty(); return; }

        if (clip.provider === 'twitch') {
            playerArea.innerHTML = '<div class="player-loading"><div class="player-empty-icon">⏳</div></div>';
            updateInfo(clip);
            const fallbackToEmbed = () => {
                renderEmbedIframe(playerArea, embedUrl);
                startAutoplayTimeout(clip);
            };
            resolveTwitchFallbackVideoUrl(clip.clipId).then((res) => {
                if (currentClip !== clip) return;
                if (res && res.unavailable) {
                    console.warn(`[Player] Skipping unavailable Twitch clip: ${clip.clipId}`);
                    skipUnavailableOrEmpty();
                } else if (res && res.url) {
                    renderDirectVideo(playerArea, res.url, 'twitch-video-player', clip, fallbackToEmbed);
                } else {
                    fallbackToEmbed();
                }
            });
        } else {
            renderEmbedIframe(playerArea, embedUrl, clip.provider === 'tiktok');
            updateInfo(clip);
            startAutoplayTimeout(clip);
        }

        const token = ClipQ.Auth?.getToken?.();
        const hasAuth = Boolean(token || ClipQ.Auth?.getActiveObsKey?.());
        const needsTwitchAuth = clip.provider === 'twitch' || clip.provider === 'twitch_vod';
        if (typeof provider.isClipAvailable === 'function' && (!needsTwitchAuth || hasAuth)) {
            provider.isClipAvailable(clip.clipId, token).then((available) => {
                if (!available && currentClip === clip) {
                    console.warn(`[Player] Removing unavailable ${clip.provider} clip without archiving: ${clip.clipId}`);
                    skipUnavailableOrEmpty();
                }
            });
        }
    }

    function getClipTimeoutMs(clip) {
        let durationSec = 0;
        if (clip.meta && clip.meta.duration) {
            durationSec = ClipQ.Providers.parseDurationSeconds(clip.meta.duration);
        }
        return (durationSec > 0 ? durationSec * 1000 : 45000) + 2000;
    }

    function scheduleAutoplayTimer(clip, waitMs) {
        clearTimeout(playTimeout);
        autoplayDeadline = Date.now() + waitMs;
        remainingAutoplayMs = waitMs;
        playTimeout = setTimeout(() => {
            if (ClipQ.App.isAutoplay() && currentClip === clip && !paused) {
                ClipQ.App.nextClip();
            }
        }, waitMs);
    }

    function clearAutoplayTimeout() {
        clearTimeout(playTimeout);
        playTimeout = null;
        autoplayDeadline = 0;
        remainingAutoplayMs = 0;
    }

    function startAutoplayTimeout(clip) {
        if (!ClipQ.App.isAutoplay() || paused) return;
        scheduleAutoplayTimer(clip, getClipTimeoutMs(clip));
    }

    function setPausedState(nextPaused) {
        const val = Boolean(nextPaused);
        if (paused === val) return;
        paused = val;
        if (paused) {
            if (playTimeout) {
                remainingAutoplayMs = Math.max(2000, autoplayDeadline - Date.now());
                clearTimeout(playTimeout);
                playTimeout = null;
            }
        } else if (ClipQ.App?.isAutoplay?.() && currentClip && !document.querySelector('#player-area video')) {
            scheduleAutoplayTimer(currentClip, remainingAutoplayMs || getClipTimeoutMs(currentClip));
        }
        syncPlaybackButtons();
    }

    function togglePause() {
        if (!currentClip) return false;
        const nextPaused = !paused;
        const videoEl = document.querySelector('#player-area video');
        if (videoEl) {
            if (nextPaused) videoEl.pause();
            else videoEl.play().catch(() => {});
        } else if (currentClip.provider === 'youtube') {
            const iframe = document.querySelector('#player-area iframe');
            iframe?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: nextPaused ? 'pauseVideo' : 'playVideo', args: [] }),
                'https://www.youtube.com'
            );
        } else if (currentClip.provider === 'tiktok') {
            sendTiktokCommand(nextPaused ? 'pause' : 'play');
        }
        setPausedState(nextPaused);
        return nextPaused;
    }

    function updateInfo(clip) {
        const container = document.getElementById('clip-details');
        if (!container) return;
        const meta = clip.meta || {};

        const largeIcon = ClipQ.PROVIDER_LARGE_ICONS[clip.provider];
        const avatarImgSrc = largeIcon || meta.avatarUrl || ClipQ.PROVIDER_ICONS?.[clip.provider];
        const safeAvatar = safeUrl(avatarImgSrc);

        const avatarHtml = safeAvatar
            ? `<img class="clip-avatar clip-avatar-icon" src="${esc(safeAvatar)}" alt="">`
            : `<div class="clip-avatar clip-avatar-fallback">🎬</div>`;

        const channelUrl = safeUrl(getChannelUrl(meta.channel, clip.provider, meta, clip.url));
        const rawClipUrl = clip.url
            ? (ClipQ.Providers?.getCanonicalUrl?.(clip.provider, clip.clipId, clip.url) || clip.url)
            : '';
        const infoUrl = channelUrl || safeUrl(rawClipUrl);
        const avatarTitle = channelUrl
            ? t('player.visit_channel', { channel: meta.channel || '' })
            : (meta.title || meta.channel || '');

        const finalAvatarHtml = infoUrl
            ? `<a href="${esc(infoUrl)}" target="_blank" rel="noopener noreferrer" class="clip-avatar-link"${avatarTitle ? ` title="${esc(avatarTitle)}"` : ''}>${avatarHtml}</a>`
            : avatarHtml;

        const channelLabel = esc(meta.channel || clip.provider);
        const channelLink = infoUrl
            ? `<a href="${esc(infoUrl)}" target="_blank" rel="noopener noreferrer">📺 ${channelLabel}</a>`
            : `📺 ${channelLabel}`;

        const inlineParts = [channelLink];
        const showTwitchMeta = !ClipQ.PROVIDER_LARGE_ICONS[clip.provider];
        if (meta.category && showTwitchMeta) {
            inlineParts.push(`<span class="clip-category">🎮 ${esc(meta.category)}</span>`);
        }
        if (meta.creator && showTwitchMeta) {
            inlineParts.push(`<span class="clip-clipper">✂️ ${esc(meta.creator)}</span>`);
        }

        if (meta.createdAt) {
            const ageText = formatAge(meta.createdAt);
            if (ageText) inlineParts.push(`<span class="clip-date">📅 ${esc(ageText)}</span>`);
        }

        const safeSubmitters = (clip.submitters || []).map(esc).join(', ');
        const submittersHtml = safeSubmitters
            ? `<div class="clip-submitters">${esc(t('player.submitted_by'))} <strong>${safeSubmitters}</strong>${clip.isPushed ? ` • <span class="badge-pushed">${esc(t('queue.pushed'))}</span>` : ''}</div>`
            : '';

        container.innerHTML = `
            ${finalAvatarHtml}
            <div class="clip-meta">
                <div class="clip-title">${esc(meta.title || 'Clip')}</div>
                <div class="clip-channel-line">${inlineParts.join(' <span class="clip-meta-sep">•</span> ')}</div>
                ${submittersHtml}
            </div>
        `;
    }

    function showEmpty() {
        currentClip = null;
        paused = false;
        tiktokUnmutePending = false;
        clearAutoplayTimeout();
        const playerArea = document.getElementById('player-area');
        if (playerArea) {
            playerArea.innerHTML = `<div class="player-empty"><div class="player-empty-icon">🎬</div><div class="player-empty-text">${esc(t('player.waiting'))}</div></div>`;
        }
        const detailsEl = document.getElementById('clip-details');
        if (detailsEl) detailsEl.innerHTML = `<div class="clip-placeholder">${esc(t('player.no_clip'))}</div>`;
        syncPlaybackButtons();
    }

    function refreshLanguage() {
        if (currentClip) {
            updateInfo(currentClip);
        } else {
            showEmpty();
        }
    }

    function getCurrent() { return currentClip; }
    function isPaused() { return paused; }

    return { playClip, showEmpty, getCurrent, isPaused, togglePause, refreshLanguage, clearAutoplayTimeout };
})();
