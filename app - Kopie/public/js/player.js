/**
 * player.js — Clip player embed and info display
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Player = (() => {
    let currentClip = null;

    function formatAge(dateStr) {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `vor ${mins} Min.`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `vor ${hours} Std.`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
        if (days < 30) return `vor ${Math.floor(days / 7)} Woche${Math.floor(days / 7) > 1 ? 'n' : ''}`;
        if (days < 365) return `vor ${Math.floor(days / 30)} Monat${Math.floor(days / 30) > 1 ? 'en' : ''}`;
        return `vor ${Math.floor(days / 365)} Jahr${Math.floor(days / 365) > 1 ? 'en' : ''}`;
    }

    function getChannelUrl(channel, provider) {
        if (!channel) return null;
        if (provider === 'twitch') return `https://twitch.tv/${channel}`;
        if (provider === 'youtube') return `https://youtube.com/@${channel}`;
        if (provider === 'kick') return `https://kick.com/${channel}`;
        return null;
    }

    function playClip(clip) {
        if (!clip) { showEmpty(); return; }
        currentClip = clip;

        const playerArea = document.getElementById('player-area');
        const provider = ClipQ.Providers.getProvider(clip.provider);
        if (!provider) { showEmpty(); return; }

        const embedUrl = provider.getEmbedUrl(clip.clipId);

        playerArea.innerHTML = `<iframe
            src="${embedUrl}"
            allowfullscreen
            allow="autoplay; encrypted-media"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        ></iframe>`;

        updateInfo(clip);
    }

    function updateInfo(clip) {
        const container = document.getElementById('clip-details');
        const meta = clip.meta || {};

        const avatarHtml = meta.avatarUrl
            ? `<img class="clip-avatar" src="${meta.avatarUrl}" alt="">`
            : `<div class="clip-avatar" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--color-border)">🎬</div>`;

        const channelUrl = getChannelUrl(meta.channel, clip.provider);
        const channelLink = channelUrl
            ? `<a href="${channelUrl}" target="_blank" rel="noopener">📺 ${meta.channel}</a>`
            : `📺 ${meta.channel || clip.provider}`;

        // Build inline info: Streamer | Category | Clipper | Date
        let inlineParts = [channelLink];
        if (meta.category) inlineParts.push(`<span class="clip-category">🎮 ${meta.category}</span>`);
        if (meta.creator) inlineParts.push(`<span class="clip-clipper">✂️ ${meta.creator}</span>`);
        if (meta.createdAt) inlineParts.push(`<span class="clip-date">📅 ${formatAge(meta.createdAt)}</span>`);

        container.innerHTML = `
            ${avatarHtml}
            <div class="clip-meta">
                <div class="clip-title">${meta.title || 'Clip'}</div>
                <div class="clip-channel-line">${inlineParts.join(' <span style="color:#444">•</span> ')}</div>
                <div class="clip-submitters">Eingereicht von: <strong>${clip.submitters.join(', ')}</strong></div>
            </div>
        `;
    }

    function showEmpty() {
        currentClip = null;
        document.getElementById('player-area').innerHTML = `
            <div class="player-empty">
                <div class="player-empty-icon">🎬</div>
                <div class="player-empty-text">Warte auf Clips...</div>
            </div>`;
        document.getElementById('clip-details').innerHTML = `<div style="color:var(--color-text-dim)">Kein Clip geladen</div>`;
    }

    function getCurrent() { return currentClip; }

    return { playClip, showEmpty, getCurrent, formatAge };
})();
