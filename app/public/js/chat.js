/**
 * chat.js — Twitch IRC chat connection via tmi.js
 * Status shown as colored ring around user avatar.
 * Health-check pings server + IRC every 5 seconds.
 * Supports: role-based command permissions, chat moderation events,
 * new commands (next, purgememory, autoplay, limit, remove, providers).
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

        // Chat moderation events
        client.on('messagedeleted', onMessageDeleted);
        client.on('timeout', onTimeout);
        client.on('ban', onBan);

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

    // ==================== CHAT MODERATION EVENTS ====================

    /**
     * A specific message was deleted (by mod or bot).
     * Remove the associated clip from the queue if it has a matching msg-id.
     */
    function onMessageDeleted(channel, username, deletedMessage, userstate) {
        const targetMsgId = userstate['target-msg-id'];
        console.log(`[Chat] 🗑 Message deleted from "${username}" (msg-id: ${targetMsgId})`);

        if (targetMsgId) {
            ClipQ.Queue.removeByMsgId(targetMsgId);
        }
    }

    /**
     * A user was timed out.
     * Smart removal: if the user is the only submitter → remove clip.
     * If there are multiple submitters → only remove the user's name.
     */
    function onTimeout(channel, username, reason, duration, userstate) {
        console.log(`[Chat] ⏱ User "${username}" timed out for ${duration}s`);
        ClipQ.Queue.removeSubmitter(username);
    }

    /**
     * A user was banned.
     * Same smart removal logic as timeout.
     */
    function onBan(channel, username, reason, userstate) {
        console.log(`[Chat] 🚫 User "${username}" banned`);
        ClipQ.Queue.removeSubmitter(username);
    }

    // ==================== MESSAGE HANDLING ====================

    function onMessage(channel, userstate, message, self) {
        const username = userstate['display-name'] || userstate.username || 'unknown';
        const msgId = userstate.id || null; // tmi.js provides message ID

        console.log(`[Chat] ${username}: ${message.substring(0, 100)}`);

        const isBroadcaster = userstate.badges && userstate.badges.broadcaster === '1';
        const isLeadMod = userstate.badges && (userstate.badges.lead_moderator === '1' || userstate.badges['lead-moderator'] === '1');
        const isMod = userstate.mod === true || isBroadcaster || isLeadMod;
        const isVip = userstate.badges && userstate.badges.vip === '1';

        const userRoles = { isBroadcaster, isLeadMod, isMod, isVip };

        // Handle commands — now role-based per command
        const commandResult = handleCommand(message, username, userRoles);
        if (commandResult === 'push') {
            // Push command: add clip at priority position
            handleClipUrl(message, {
                name: username,
                isMod, isLeadMod, isVip, isBroadcaster,
                isPushed: true,
                msgId
            });
            return;
        }
        if (commandResult === 'handled') return;

        // Regular message — check for clip URLs
        handleClipUrl(message, {
            name: username,
            isMod, isLeadMod, isVip, isBroadcaster,
            isPushed: false,
            msgId
        });
    }

    /**
     * Handle chat commands with role-based permissions.
     * @returns {'handled'|'push'|false}
     */
    function handleCommand(message, username, userRoles) {
        const settings = ClipQ.Settings.get();
        const prefix = settings.commands.prefix.toLowerCase();
        const msg = message.trim().toLowerCase();

        if (!msg.startsWith(prefix)) return false;
        const afterPrefix = msg.substring(prefix.length).trim();
        const parts = afterPrefix.split(/\s+/);
        const cmd = parts[0] || '';
        const arg1 = parts[1] || '';
        const arg2 = parts[2] || '';

        // Helper to get command word
        const cmdWord = (key) => (settings.commands[key]?.word || key).toLowerCase();
        const hasPermission = (key) => ClipQ.Settings.hasCommandPermission(key, userRoles);

        // next (skip)
        if (cmd === cmdWord('next')) {
            if (!hasPermission('next')) return false;
            console.log(`[Cmd] ${username}: next`);
            ClipQ.App.nextClip();
            return 'handled';
        }

        // push
        if (cmd === cmdWord('push')) {
            if (!hasPermission('push')) return false;
            console.log(`[Cmd] ${username}: push`);
            return 'push';
        }

        // open
        if (cmd === cmdWord('open')) {
            if (!hasPermission('open')) return false;
            console.log(`[Cmd] ${username}: open`);
            ClipQ.App.setQueueOpen(true);
            return 'handled';
        }

        // close
        if (cmd === cmdWord('close')) {
            if (!hasPermission('close')) return false;
            console.log(`[Cmd] ${username}: close`);
            ClipQ.App.setQueueOpen(false);
            return 'handled';
        }

        // clear
        if (cmd === cmdWord('clear')) {
            if (!hasPermission('clear')) return false;
            console.log(`[Cmd] ${username}: clear`);
            ClipQ.Queue.clear();
            return 'handled';
        }

        // purgememory
        if (cmd === cmdWord('purgememory')) {
            if (!hasPermission('purgememory')) return false;
            console.log(`[Cmd] ${username}: purgememory`);
            ClipQ.Memory.purge();
            return 'handled';
        }

        // autoplay [on/off]
        if (cmd === cmdWord('autoplay')) {
            if (!hasPermission('autoplay')) return false;
            if (arg1 === 'on') {
                console.log(`[Cmd] ${username}: autoplay on`);
                ClipQ.App.setAutoplay(true);
            } else if (arg1 === 'off') {
                console.log(`[Cmd] ${username}: autoplay off`);
                ClipQ.App.setAutoplay(false);
            }
            return 'handled';
        }

        // limit [number]
        if (cmd === cmdWord('limit')) {
            if (!hasPermission('limit')) return false;
            const num = parseInt(arg1);
            if (!isNaN(num) && num >= 0) {
                console.log(`[Cmd] ${username}: limit ${num}`);
                ClipQ.App.setClipLimit(num);
            }
            return 'handled';
        }

        // remove [url] / remove all
        if (cmd === cmdWord('remove')) {
            // "remove all" — everyone can remove their own clips
            if (arg1 === 'all') {
                console.log(`[Cmd] ${username}: remove all (own clips)`);
                ClipQ.Queue.removeSubmitter(username);
                return 'handled';
            }

            // "remove [url]" — check if user has permission OR is removing own clip
            const urlArg = afterPrefix.substring(cmdWord('remove').length).trim();
            if (urlArg) {
                if (hasPermission('remove')) {
                    // Privileged user: remove the entire clip
                    console.log(`[Cmd] ${username}: remove (privileged) ${urlArg}`);
                    ClipQ.Queue.removeByUrl(urlArg);
                } else {
                    // Regular user: can only remove their own submitted clip
                    console.log(`[Cmd] ${username}: remove (own) ${urlArg}`);
                    ClipQ.Queue.removeOwnClipByUrl(urlArg, username);
                }
                return 'handled';
            }
            return 'handled';
        }

        // providers [provider] [on/off]
        if (cmd === cmdWord('providers')) {
            if (!hasPermission('providers')) return false;
            const providerName = arg1.toLowerCase();
            const state = arg2.toLowerCase();
            if (providerName && (state === 'on' || state === 'off')) {
                console.log(`[Cmd] ${username}: providers ${providerName} ${state}`);
                ClipQ.App.setProvider(providerName, state === 'on');
            }
            return 'handled';
        }

        return false;
    }

    async function handleClipUrl(message, submitterInfo) {
        const username = submitterInfo.name;
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
            meta: meta || { title: 'Clip', channel: parsed.providerName, thumbnail: '' },
            isPushed: !!submitterInfo.isPushed,
            msgId: submitterInfo.msgId || null
        }, submitterInfo);

        console.log(`[Queue] → ${result}`);
    }

    async function reconnect(channel) {
        await connect(channel);
    }

    return { connect, reconnect };
})();
