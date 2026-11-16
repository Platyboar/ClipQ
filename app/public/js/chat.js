/**
 * chat.js — Twitch IRC chat connection via tmi.js
 * Status shown as colored ring around user avatar.
 * Health-check pings server + IRC every 5 seconds.
 * Supports: role-based command permissions, chat moderation events,
 * commands (next, push, open, close, clear, purgememory, autoplay, limit, remove, providers).
 */
window.ClipQ = window.ClipQ || {};

ClipQ.Chat = (() => {
    'use strict';

    let client = null;
    let healthInterval = null;

    function stopHealthCheck() {
        if (healthInterval) {
            clearInterval(healthInterval);
            healthInterval = null;
        }
    }

    function setConnected(connected) {
        const ring = document.getElementById('avatar-ring');
        if (ring) ring.classList.toggle('connected', connected);
    }

    async function connect(channel) {
        stopHealthCheck();
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
            try {
                if (typeof client.removeAllListeners === 'function') client.removeAllListeners();
                client.disconnect();
            } catch { /* ignore */ }
        }

        console.log(`[Chat] Connecting to #${channel}...`);

        const activeClient = new tmi.client({
            options: { skipUpdatingEmotesets: true, debug: false },
            connection: { secure: true, reconnect: true },
            identity: {
                username: 'justinfan' + Math.floor(Math.random() * 99999),
                password: ''
            },
            channels: [channel]
        });
        client = activeClient;

        activeClient.on('message', onMessage);

        // Chat moderation events
        activeClient.on('messagedeleted', onMessageDeleted);
        activeClient.on('timeout', onTimeout);
        activeClient.on('ban', onBan);

        activeClient.on('connected', (addr, port) => {
            if (activeClient !== client) return;
            console.log(`[Chat] ✓ Connected to IRC (${addr}:${port})`);
        });

        activeClient.on('join', (ch, username, self) => {
            if (activeClient !== client) return;
            if (self) {
                console.log(`[Chat] ✓ Joined ${ch} — listening for clips`);
                setConnected(true);
            }
        });

        activeClient.on('disconnected', (reason) => {
            if (activeClient !== client) return;
            console.warn('[Chat] ✗ Disconnected:', reason);
            setConnected(false);
        });

        activeClient.on('reconnect', () => {
            if (activeClient !== client) return;
            console.log('[Chat] ↻ Reconnecting...');
        });

        try {
            await activeClient.connect();
        } catch (e) {
            if (activeClient !== client) return;
            console.error('[Chat] ✗ Connection failed:', e);
            setConnected(false);
        }

        startHealthCheck();
    }

    function startHealthCheck() {
        if (healthInterval) clearInterval(healthInterval);
        const host = window.location.hostname;
        const isLocalServer = host === 'localhost' || host === '127.0.0.1';

        healthInterval = setInterval(() => {
            const ircOk = Boolean(client && client.readyState() === 'OPEN');
            if (!isLocalServer) {
                setConnected(navigator.onLine !== false && ircOk);
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            fetch('/health', { signal: controller.signal })
                .then(res => {
                    clearTimeout(timeoutId);
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

    function onMessageDeleted(channel, username, deletedMessage, userstate) {
        const targetMsgId = userstate['target-msg-id'];
        console.log(`[Chat] 🗑 Message deleted from "${username}" (msg-id: ${targetMsgId})`);

        if (targetMsgId) {
            ClipQ.Queue.removeByMsgId(targetMsgId);
        }
    }

    function onTimeout(channel, username, reason, duration) {
        console.log(`[Chat] ⏱ User "${username}" timed out for ${duration}s`);
        ClipQ.Queue.removeSubmitter(username);
    }

    function onBan(channel, username) {
        console.log(`[Chat] 🚫 User "${username}" banned`);
        ClipQ.Queue.removeSubmitter(username);
    }

    // ==================== MESSAGE HANDLING ====================

    function onMessage(channel, userstate, message, self) {
        if (self) return;

        const username = userstate['display-name'] || userstate.username || 'unknown';
        const login = (userstate.username || username).toLowerCase();
        const msgId = userstate.id || null;

        console.log(`[Chat] ${username}: ${message.substring(0, 100)}`);

        const badges = userstate.badges;
        const hasBadge = (key) => Boolean(badges && badges[key] && badges[key] !== '0');
        const isBroadcaster = hasBadge('broadcaster');
        const isLeadMod = hasBadge('lead_moderator') || hasBadge('lead-moderator');
        const isMod = !isBroadcaster && !isLeadMod && (userstate.mod === true || hasBadge('moderator'));
        const isVip = hasBadge('vip');

        const userRoles = { isBroadcaster, isLeadMod, isMod, isVip };

        const commandResult = handleCommand(message, username, login, userRoles);
        if (commandResult === 'handled') return;

        handleClipUrl(message, {
            name: username,
            login,
            isMod, isLeadMod, isVip, isBroadcaster,
            isPushed: commandResult === 'push',
            msgId
        });
    }

    function handleRemoveCommand(rawAfterPrefix, username, login, canRemoveAny) {
        const firstSpaceIdx = rawAfterPrefix.search(/\s/);
        const rawRest = firstSpaceIdx === -1 ? '' : rawAfterPrefix.slice(firstSpaceIdx).trim();
        if (!rawRest) return 'handled';

        const firstToken = rawRest.split(/\s+/)[0];
        if (firstToken.toLowerCase() === 'all') {
            console.log(`[Cmd] ${username}: remove all (own clips)`);
            ClipQ.Queue.removeSubmitter(login || username);
            return 'handled';
        }

        const isUrlArg = /^https?:\/\//i.test(firstToken) || firstToken.includes('/') || firstToken.includes('.');
        if (isUrlArg) {
            if (canRemoveAny) {
                console.log(`[Cmd] ${username}: remove (privileged) ${rawRest}`);
                ClipQ.Queue.removeByUrl(rawRest);
            } else {
                console.log(`[Cmd] ${username}: remove (own) ${rawRest}`);
                ClipQ.Queue.removeOwnClipByUrl(rawRest, login || username);
            }
            return 'handled';
        }

        const targetUser = firstToken.replace(/^@/, '').trim();
        if (targetUser) {
            const targetLower = targetUser.toLowerCase();
            const isSelf = targetLower === (login || username).toLowerCase() || targetLower === username.toLowerCase();
            if (isSelf || canRemoveAny) {
                console.log(`[Cmd] ${username}: remove user ${targetUser}`);
                ClipQ.Queue.removeSubmitter(targetUser);
            }
        }
        return 'handled';
    }

    /**
     * Handle chat commands with role-based permissions.
     * @returns {'handled'|'push'|false}
     */
    function handleCommand(message, username, login, userRoles) {
        const settings = ClipQ.Settings.get();
        const prefix = (settings.commands.prefix || '').trim().toLowerCase();
        if (!prefix) return false;

        const rawTrimmed = message.trim();
        const msg = rawTrimmed.toLowerCase();

        if (!msg.startsWith(prefix)) return false;
        // Enforce that the command prefix is followed by whitespace (e.g., !clipq next instead of !clipqnext)
        if (msg.length <= prefix.length || !/\s/.test(msg.charAt(prefix.length))) return false;

        const rawAfterPrefix = rawTrimmed.substring(prefix.length).trim();
        const afterPrefix = rawAfterPrefix.toLowerCase();
        const parts = afterPrefix.split(/\s+/);
        const cmd = parts[0] || '';
        const arg1 = parts[1] || '';
        const arg2 = parts[2] || '';

        const cmdWord = (key) => (settings.commands[key]?.word || '').trim().toLowerCase();
        const hasPermission = (key) => ClipQ.Settings.hasCommandPermission(key, userRoles);

        const matchesCmd = (key) => {
            const word = cmdWord(key);
            return Boolean(word) && cmd === word;
        };

        if (matchesCmd('next')) {
            if (!hasPermission('next')) return false;
            console.log(`[Cmd] ${username}: next`);
            ClipQ.App.nextClip();
            return 'handled';
        }

        if (matchesCmd('push')) {
            if (!hasPermission('push')) return false;
            console.log(`[Cmd] ${username}: push`);
            return 'push';
        }

        if (matchesCmd('open')) {
            if (!hasPermission('open')) return false;
            console.log(`[Cmd] ${username}: open`);
            ClipQ.App.setQueueOpen(true);
            return 'handled';
        }

        if (matchesCmd('close')) {
            if (!hasPermission('close')) return false;
            console.log(`[Cmd] ${username}: close`);
            ClipQ.App.setQueueOpen(false);
            return 'handled';
        }

        if (matchesCmd('clear')) {
            if (!hasPermission('clear')) return false;
            console.log(`[Cmd] ${username}: clear`);
            ClipQ.Queue.clear();
            return 'handled';
        }

        if (matchesCmd('purgememory')) {
            if (!hasPermission('purgememory')) return false;
            console.log(`[Cmd] ${username}: purgememory`);
            ClipQ.Memory.purge();
            return 'handled';
        }

        if (matchesCmd('autoplay')) {
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

        if (matchesCmd('limit')) {
            if (!hasPermission('limit')) return false;
            const num = /^\d+$/.test(arg1) ? parseInt(arg1, 10) : NaN;
            if (!Number.isNaN(num) && num >= 0) {
                console.log(`[Cmd] ${username}: limit ${num}`);
                ClipQ.App.setClipLimit(num);
            }
            return 'handled';
        }

        if (matchesCmd('remove')) {
            return handleRemoveCommand(rawAfterPrefix, username, login, hasPermission('remove'));
        }

        if (matchesCmd('providers')) {
            if (!hasPermission('providers')) return false;
            if (arg1 && (arg2 === 'on' || arg2 === 'off')) {
                console.log(`[Cmd] ${username}: providers ${arg1} ${arg2}`);
                ClipQ.App.setProvider(arg1, arg2 === 'on');
            }
            return 'handled';
        }

        return false;
    }

    async function handleClipUrl(message, submitterInfo) {
        const username = submitterInfo.name;
        const login = submitterInfo.login || username;
        const settings = ClipQ.Settings.get();

        if (ClipQ.Settings.isUserBlocked(username) || ClipQ.Settings.isUserBlocked(login)) {
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

        if (meta && meta.unavailable) {
            console.log(`[Chat] ⊘ Clip "${parsed.id}" is unavailable — skipped`);
            return;
        }

        if (meta && meta.resolvedId) {
            parsed.id = meta.resolvedId;
        }
        if (meta && meta.canonicalUrl) {
            parsed.url = meta.canonicalUrl;
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

    return { connect };
})();
