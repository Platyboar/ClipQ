/**
 * chat.js — Twitch IRC chat connection via tmi.js
 * Status shown as colored ring around user avatar.
 * Health-check pings server + IRC every 5 seconds.
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Chat = (() => {
    let client = null;
    let healthInterval = null;

    function setConnected(connected) {
        const ring = document.getElementById('avatar-ring');
        if (ring) ring.classList.toggle('connected', connected);
    }

    async function connect(channel) {
        if (!channel) {
            console.error('[Chat] ✗ No channel specified!');
            setConnected(false);
            return;
        }

        if (typeof tmi === 'undefined') {
            console.error('[Chat] ✗ tmi.js not loaded!');
            setConnected(false);
            return;
        }

        if (client) {
            try { client.disconnect(); } catch (e) { /* ignore */ }
        }

        console.log(`[Chat] Connecting to #${channel}...`);

        client = new tmi.client({
            options: { skipUpdatingEmotesets: true, debug: false },
            connection: { secure: true, reconnect: true },
            identity: {
                username: 'justinfan' + Math.floor(Math.random() * 99999),
                password: ''
            },
            channels: [channel]
        });

        client.on('message', onMessage);

        client.on('connected', (addr, port) => {
            console.log(`[Chat] ✓ Connected to IRC (${addr}:${port})`);
        });

        client.on('join', (ch, username, self) => {
            if (self) {
                console.log(`[Chat] ✓ Joined ${ch} — listening for clips`);
                setConnected(true);
            }
        });

        client.on('disconnected', (reason) => {
            console.warn('[Chat] ✗ Disconnected:', reason);
            setConnected(false);
        });

        client.on('reconnect', () => {
            console.log('[Chat] ↻ Reconnecting...');
        });

        try {
            await client.connect();
        } catch (e) {
            console.error('[Chat] ✗ Connection failed:', e);
            setConnected(false);
        }

        // Start health check every 5 seconds
        startHealthCheck();
    }

    function startHealthCheck() {
        if (healthInterval) clearInterval(healthInterval);
        healthInterval = setInterval(() => {
            // Check 1: Is the local server still running?
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            fetch('/health', { signal: controller.signal })
                .then(res => {
                    clearTimeout(timeoutId);
                    const ircOk = client && client.readyState() === 'OPEN';
                    setConnected(res.ok && ircOk);
                })
                .catch(() => {
                    clearTimeout(timeoutId);
                    console.log('[Health] Server unreachable');
                    setConnected(false);
                });
        }, 5000);
    }

    function onMessage(channel, userstate, message, self) {
        const username = userstate['display-name'] || userstate.username || 'unknown';

        console.log(`[Chat] ${username}: ${message.substring(0, 100)}`);

        const isMod = userstate.mod === true || (userstate.badges && userstate.badges.broadcaster === '1');
        const isBroadcaster = userstate.badges && userstate.badges.broadcaster === '1';

        if (isMod || isBroadcaster) {
            handleCommand(message, username);
        }

        handleClipUrl(message, username);
    }

    function handleCommand(message, username) {
        const settings = ClipQ.Settings.get();
        const prefix = settings.commands.prefix.toLowerCase();
        const msg = message.trim().toLowerCase();

        if (!msg.startsWith(prefix)) return;
        const cmd = msg.substring(prefix.length);

        if (cmd === settings.commands.skip.toLowerCase()) {
            console.log(`[Cmd] ${username}: skip`);
            ClipQ.App.nextClip();
        } else if (cmd === settings.commands.open.toLowerCase()) {
            console.log(`[Cmd] ${username}: open`);
            ClipQ.App.setQueueOpen(true);
        } else if (cmd === settings.commands.close.toLowerCase()) {
            console.log(`[Cmd] ${username}: close`);
            ClipQ.App.setQueueOpen(false);
        } else if (cmd === settings.commands.clear.toLowerCase()) {
            console.log(`[Cmd] ${username}: clear`);
            ClipQ.Queue.clear();
        }
    }

    async function handleClipUrl(message, username) {
        const settings = ClipQ.Settings.get();

        if (ClipQ.Settings.isUserBlocked(username)) {
            console.log(`[Chat] ⊘ Blocked user "${username}"`);
            return;
        }

        const parsed = ClipQ.Providers.parseClipUrl(message, settings.providers);
        if (!parsed) return;

        console.log(`[Chat] 🎬 Clip detected from "${username}": [${parsed.providerName}] ${parsed.id}`);

        if (parsed.channelName && ClipQ.Settings.isStreamerBlocked(parsed.channelName)) {
            console.log(`[Chat] ⊘ Blocked streamer "${parsed.channelName}"`);
            return;
        }

        if (!ClipQ.Queue.isQueueOpen()) {
            console.log(`[Chat] ⊘ Queue is CLOSED — clip rejected`);
            return;
        }

        const provider = ClipQ.Providers.getProvider(parsed.provider);
        let meta = null;
        if (provider && provider.fetchMeta) {
            const token = ClipQ.Auth.getToken();
            try {
                meta = await provider.fetchMeta(parsed.id, token, parsed.url);
                console.log(`[Chat] ✓ Meta: "${meta?.title}" by ${meta?.channel}`);
            } catch (e) {
                console.warn('[Chat] Meta fetch failed:', e);
            }
        }

        if (meta && meta.channel && ClipQ.Settings.isStreamerBlocked(meta.channel)) {
            console.log(`[Chat] ⊘ Blocked streamer "${meta.channel}" (metadata)`);
            return;
        }

        const result = ClipQ.Queue.addClip({
            provider: parsed.provider,
            url: parsed.url,
            clipId: parsed.id,
            meta: meta || { title: 'Clip', channel: parsed.providerName, thumbnail: '' }
        }, username);

        console.log(`[Queue] → ${result}`);

        // Do NOT auto-play. User must click "Nächster" to start.
    }

    async function reconnect(channel) {
        await connect(channel);
    }

    return { connect, reconnect };
})();
