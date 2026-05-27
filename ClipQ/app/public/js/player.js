/**
 * player.js — Clip player embed and info display
 * Supports: i18n for all user-facing strings.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Player = (() => {
    let currentClip = null;
    let playTimeout = null;
    const t = (key, params) => ClipQ.I18n.t(key, params);

    function formatAge(dateStr) {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
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

    function getChannelUrl(channelName, provider, meta = {}) {
        if (!channelName) return '';
        if (provider === 'twitch') return `https://www.twitch.tv/${channelName}`;
        if (provider === 'youtube') {
            if (meta.authorUrl) return meta.authorUrl;
            return `https://www.youtube.com/results?search_query=${encodeURIComponent(channelName)}`;
        }
        if (provider === 'tiktok') {
            let user = channelName.startsWith('@') ? channelName : `@${channelName}`;
            return `https://www.tiktok.com/${user}`;
        }
        if (provider === 'instagram') {
            return `https://www.instagram.com/${channelName.replace(/^@/, '')}`;
        }

        return '';
    }

    function playClip(clip) {
        if (!clip) { showEmpty(); return; }
        currentClip = clip;

        clearTimeout(playTimeout);

        const playerArea = document.getElementById('player-area');
        const provider = ClipQ.Providers.getProvider(clip.provider);
        if (!provider) { showEmpty(); return; }

        if (clip.provider === 'instagram') {
            // Show loading indicator
            playerArea.innerHTML = `
            <div style="width:100%; height:100%; background:#000; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#fff; font-family:sans-serif;">
                <div class="player-empty-icon" style="margin-bottom: 15px;">⏳</div>
                <div style="font-size:18px;">${t('player.loading_instagram')}</div>
            </div>`;

            fetch(`/api/video-url?url=${encodeURIComponent(clip.url)}`)
                .then(res => {
                    if (!res.ok) throw new Error('API request failed');
                    return res.json();
                })
                .then(data => {
                    if (!data.url) throw new Error('No video URL returned');

                    if (currentClip !== clip) return;

                    // Update metadata if it was missing
                    if (data.duration) clip.meta.duration = data.duration;
                    if (data.title && !clip.meta.title) clip.meta.title = data.title;
                    if (data.uploader && (!clip.meta.channel || clip.meta.channel === 'Instagram')) {
                        clip.meta.channel = data.uploader;
                        clip.meta.creator = data.uploader;
                    }
                    updateInfo(clip);

                    playerArea.innerHTML = `
                    <div style="width:100%; height:100%; background:#000; display:flex; justify-content:center; align-items:center;">
                        <video
                            id="instagram-video-player"
                            src="${data.url}"
                            autoplay
                            controls
                            style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; border:none;"
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
                            console.error('Instagram HTML5 video playback error', e);
                            if (ClipQ.App.isAutoplay() && currentClip === clip) {
                                playTimeout = setTimeout(() => {
                                    ClipQ.App.nextClip();
                                }, 3000);
                            }
                        });
                    }
                })
                .catch(err => {
                    console.warn('Could not fetch direct Instagram video URL, falling back to iframe', err);
                    if (currentClip !== clip) return;

                    const embedUrl = provider.getEmbedUrl(clip.clipId);
                    playerArea.innerHTML = `
                    <div style="width:100%; height:100%; background:#000; position:relative; overflow:hidden; display:flex; justify-content:center;">
                        <iframe
                            src="${embedUrl}"
                            scrolling="no"
                            style="width:340px; height:750px; transform:scale(1.81); transform-origin:top center; position:absolute; top:0px; border:none;"
                            allowfullscreen
                            allow="autoplay; encrypted-media"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                        ></iframe>
                    </div>`;

                    startAutoplayTimeout(clip);
                });

            updateInfo(clip);
            return;
        }

        const embedUrl = provider.getEmbedUrl(clip.clipId);

        if (clip.provider === 'tiktok') {
            playerArea.innerHTML = `
            <div style="width:100%; height:100%; background:#000; position:relative; overflow:hidden; display:flex; justify-content:center;">
                <iframe
                    src="${embedUrl}"
                    scrolling="no"
                    style="width:340px; height:750px; transform:scale(1.81); transform-origin:top center; position:absolute; top:0px; border:none;"
                    allowfullscreen
                    allow="autoplay; encrypted-media"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                ></iframe>
            </div>`;
        } else {
            playerArea.innerHTML = `<iframe
                src="${embedUrl}"
                allowfullscreen
                allow="autoplay; encrypted-media"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            ></iframe>`;
        }

        updateInfo(clip);
        startAutoplayTimeout(clip);
    }

    function startAutoplayTimeout(clip) {
        if (ClipQ.App.isAutoplay()) {
            let durationMs = 0;
            if (clip.meta && clip.meta.duration) {
                durationMs = parseFloat(clip.meta.duration) * 1000;
            } else {
                durationMs = 45000;
            }
            if (durationMs > 0) {
                playTimeout = setTimeout(() => {
                    ClipQ.App.nextClip();
                }, durationMs + 2000);
            }
        }
    }

    function updateInfo(clip) {
        const container = document.getElementById('clip-details');
        const meta = clip.meta || {};

        let avatarImgSrc = meta.avatarUrl;
        if (!avatarImgSrc || clip.provider === 'youtube' || clip.provider === 'tiktok' || clip.provider === 'instagram') {
            if (clip.provider === 'youtube') {
                avatarImgSrc = 'https://img.icons8.com/color/512/youtube-play.png';
            } else if (clip.provider === 'tiktok') {
                avatarImgSrc = 'https://img.icons8.com/color/512/tiktok.png';
            } else if (clip.provider === 'instagram') {
                avatarImgSrc = 'https://img.icons8.com/color/512/instagram-new.png';
            } else {
                avatarImgSrc = ClipQ.PROVIDER_ICONS[clip.provider];
            }
        }

        const avatarHtml = avatarImgSrc
            ? `<img class="clip-avatar" src="${avatarImgSrc}" alt="" style="padding:4px; object-fit:contain; background:rgba(0,0,0,0.2);">`
            : `<div class="clip-avatar" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--color-border)">🎬</div>`;

        const channelUrl = getChannelUrl(meta.channel, clip.provider, meta);

        const finalAvatarHtml = channelUrl
            ? `<a href="${channelUrl}" target="_blank" rel="noopener" style="display:block;flex-shrink:0;" title="${t('player.visit_channel', { channel: meta.channel })}">${avatarHtml}</a>`
            : avatarHtml;

        const channelLink = channelUrl
            ? `<a href="${channelUrl}" target="_blank" rel="noopener">📺 ${meta.channel}</a>`
            : `📺 ${meta.channel || clip.provider}`;

        // Build inline info: Streamer | Category | Clipper | Date
        let inlineParts = [channelLink];
        if (meta.category && clip.provider !== 'youtube' && clip.provider !== 'tiktok' && clip.provider !== 'instagram') inlineParts.push(`<span class="clip-category">🎮 ${meta.category}</span>`);
        if (meta.creator && clip.provider !== 'youtube' && clip.provider !== 'tiktok' && clip.provider !== 'instagram') inlineParts.push(`<span class="clip-clipper">✂️ ${meta.creator}</span>`);

        if (meta.createdAt) {
            inlineParts.push(`<span class="clip-date">📅 ${formatAge(meta.createdAt)}</span>`);
        }

        const submittersHtml = clip.submitters && clip.submitters.length > 0
            ? `<div class="clip-submitters">${t('player.submitted_by')} <strong>${clip.submitters.join(', ')}</strong>${clip.isPushed ? ` • <span class="badge-pushed">${t('queue.pushed')}</span>` : ''}</div>`
            : '';

        container.innerHTML = `
            ${finalAvatarHtml}
            <div class="clip-meta">
                <div class="clip-title">${meta.title || 'Clip'}</div>
                <div class="clip-channel-line">${inlineParts.join(' <span style="color:#444">•</span> ')}</div>
                ${submittersHtml}
            </div>
        `;
    }

    function showEmpty() {
        currentClip = null;
        clearTimeout(playTimeout);
        document.getElementById('player-area').innerHTML = `
            <div class="player-empty">
                <div class="player-empty-icon">🎬</div>
                <div class="player-empty-text">${t('player.waiting')}</div>
            </div>`;
        document.getElementById('clip-details').innerHTML = `<div style="color:var(--color-text-dim)">${t('player.no_clip')}</div>`;
    }

    function getCurrent() { return currentClip; }

    return { playClip, showEmpty, getCurrent, formatAge };
})();
