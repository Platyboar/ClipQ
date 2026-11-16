/**
 * player.js — Clip player embed and info display
 * Supports: i18n, XSS-safe rendering, responsive vertical embeds, and Twitch VOD duration parsing.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Player = (() => {
    'use strict';

    let currentClip = null;
    let playTimeout = null;
    let tiktokUnmutePending = false;
    const t = (key, params) => ClipQ.I18n.t(key, params);
    const esc = (val) => ClipQ.escapeHtml(val);
    const safeUrl = (val) => ClipQ.sanitizeUrl(val);

    const DIRECT_URL_MAX_AGE_MS = 5 * 60 * 1000;

    function formatAge(dateStr) {
        if (!dateStr) return '';
        const timestamp = new Date(dateStr).getTime();
        if (Number.isNaN(timestamp)) return '';

        const diff = Math.max(0, Date.now() - timestamp);
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return t('time.minutes_ago', { count: mins });
        const hours = Math.floor(mins / 60);
        if (hours < 24) return t('time.hours_ago', { count: hours });
        const days = Math.floor(hours / 24);
        if (days < 7) {
            return days === 1
                ? t('time.day_ago', { count: days })
                : t('time.days_ago', { count: days });
        }
        const weeks = Math.floor(days / 7);
        if (days < 30) {
            return weeks === 1
                ? t('time.week_ago', { count: weeks })
                : t('time.weeks_ago', { count: weeks });
        }
        const months = Math.floor(days / 30);
        if (days < 365) {
            return months === 1
                ? t('time.month_ago', { count: months })
                : t('time.months_ago', { count: months });
        }
        const years = Math.floor(days / 365);
        return years === 1
            ? t('time.year_ago', { count: years })
            : t('time.years_ago', { count: years });
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

    function renderVerticalIframe(playerArea, embedUrl, extraClass = '') {
        const cleanEmbed = safeUrl(embedUrl);
        if (!cleanEmbed) {
            showEmpty();
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

    function renderInstagramVideo(playerArea, videoUrl, provider, clip) {
        const cleanVideoUrl = safeUrl(videoUrl);
        if (!cleanVideoUrl) {
            renderVerticalIframe(playerArea, provider.getEmbedUrl(clip.clipId, clip.url), 'instagram-embed-wrap');
            startAutoplayTimeout(clip);
            return;
        }

        playerArea.innerHTML = `
        <div class="direct-video-wrap">
            <video
                id="instagram-video-player"
                src="${esc(cleanVideoUrl)}"
                autoplay
                controls
            ></video>
        </div>`;

        const videoEl = document.getElementById('instagram-video-player');
        if (videoEl) {
            videoEl.addEventListener('ended', () => {
                if (ClipQ.App.isAutoplay() && currentClip === clip) {
                    ClipQ.App.nextClip();
                }
            });
            videoEl.addEventListener('error', (e) => {
                console.warn('Instagram HTML5 video playback error, falling back to iframe', e);
                if (currentClip === clip) {
                    renderVerticalIframe(playerArea, provider.getEmbedUrl(clip.clipId, clip.url), 'instagram-embed-wrap');
                    startAutoplayTimeout(clip);
                }
            });
        }
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

        if (data.type === 'onStateChange' && data.value === 1 && tiktokUnmutePending) {
            sendTiktokCommand('unMute');
            sendTiktokCommand('setVolume', 100);
            tiktokUnmutePending = false;
        } else if (data.type === 'onStateChange' && data.value === 0 && ClipQ.App.isAutoplay()) {
            ClipQ.App.nextClip();
        }
    });

    function playClip(clip) {
        if (!clip) { showEmpty(); return; }
        currentClip = clip;
        tiktokUnmutePending = clip.provider === 'tiktok';

        clearAutoplayTimeout();

        const playerArea = document.getElementById('player-area');
        if (!playerArea) return;
        const provider = ClipQ.Providers.getProvider(clip.provider);
        if (!provider) { showEmpty(); return; }

        if (clip.provider === 'instagram') {
            updateInfo(clip);

            const cachedUrl = clip.meta?.directUrl;
            const cachedAt = clip.meta?.directUrlFetchedAt || 0;
            if (cachedUrl && (Date.now() - cachedAt) < DIRECT_URL_MAX_AGE_MS) {
                renderInstagramVideo(playerArea, cachedUrl, provider, clip);
                return;
            }

            playerArea.innerHTML = `
            <div class="player-loading">
                <div class="player-empty-icon">⏳</div>
                <div class="player-loading-text">${esc(t('player.loading_instagram'))}</div>
            </div>`;

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
        if (!embedUrl) { showEmpty(); return; }

        if (clip.provider === 'tiktok') {
            renderVerticalIframe(playerArea, embedUrl);
        } else {
            playerArea.innerHTML = `<iframe
                src="${esc(embedUrl)}"
                allowfullscreen
                allow="autoplay; encrypted-media"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            ></iframe>`;
        }

        const token = ClipQ.Auth?.getToken?.();
        if (clip.provider === 'twitch' && token && typeof provider.isClipAvailable === 'function') {
            provider.isClipAvailable(clip.clipId, token).then((available) => {
                if (!available && currentClip === clip) {
                    console.warn(`[Player] Removing unavailable Twitch clip without archiving: ${clip.clipId}`);
                    ClipQ.App.skipUnavailableClip();
                }
            });
        }

        updateInfo(clip);
        startAutoplayTimeout(clip);
    }

    function clearAutoplayTimeout() {
        clearTimeout(playTimeout);
        playTimeout = null;
    }

    function startAutoplayTimeout(clip) {
        if (!ClipQ.App.isAutoplay()) return;

        let durationSec = 0;
        if (clip.meta && clip.meta.duration) {
            durationSec = ClipQ.Providers.parseDurationSeconds(clip.meta.duration);
        }
        const durationMs = durationSec > 0 ? durationSec * 1000 : 45000;
        playTimeout = setTimeout(() => {
            if (ClipQ.App.isAutoplay() && currentClip === clip) {
                ClipQ.App.nextClip();
            }
        }, durationMs + 2000);
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
        tiktokUnmutePending = false;
        clearAutoplayTimeout();
        const playerArea = document.getElementById('player-area');
        if (playerArea) {
            playerArea.innerHTML = `
            <div class="player-empty">
                <div class="player-empty-icon">🎬</div>
                <div class="player-empty-text">${esc(t('player.waiting'))}</div>
            </div>`;
        }
        const detailsEl = document.getElementById('clip-details');
        if (detailsEl) detailsEl.innerHTML = `<div class="clip-placeholder">${esc(t('player.no_clip'))}</div>`;
    }

    function refreshLanguage() {
        if (currentClip) {
            updateInfo(currentClip);
        } else {
            showEmpty();
        }
    }

    function getCurrent() { return currentClip; }

    return { playClip, showEmpty, getCurrent, refreshLanguage, clearAutoplayTimeout };
})();
