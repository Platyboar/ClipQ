/**
 * sync-live.js — Optional Durable Object WebSocket listener for instant Browser -> OBS sync
 */
window.ClipQ = window.ClipQ || {};

ClipQ.SyncLive = (() => {
    'use strict';

    const HEARTBEAT_MS = 120000;
    const BASE_RECONNECT_MS = 2000;
    const MAX_RECONNECT_MS = 30000;

    const clientId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `tab_${Math.random().toString(36).slice(2)}_${Date.now()}`;

    let socket = null;
    let desiredUrl = '';
    let syncHandler = null;
    let heartbeatTimer = null;
    let reconnectTimer = null;
    let reconnectAttempt = 0;

    function getClientId() {
        return clientId;
    }

    function clearTimers() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    }

    function closeSocketOnly() {
        clearTimers();
        if (socket) {
            const old = socket;
            socket = null;
            try { old.onclose = null; old.onerror = null; old.onmessage = null; old.close(); } catch { /* ignore */ }
        }
    }

    function scheduleReconnect() {
        if (!desiredUrl || reconnectTimer) return;
        const delay = Math.min(MAX_RECONNECT_MS, BASE_RECONNECT_MS * Math.pow(2, reconnectAttempt));
        reconnectAttempt++;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            openSocket();
        }, delay);
    }

    function openSocket() {
        if (!desiredUrl || typeof WebSocket === 'undefined') return;
        closeSocketOnly();

        let ws;
        try {
            ws = new WebSocket(desiredUrl);
        } catch {
            scheduleReconnect();
            return;
        }
        socket = ws;

        ws.onopen = () => {
            if (socket !== ws) return;
            reconnectAttempt = 0;
            clearTimers();
            heartbeatTimer = setInterval(() => {
                if (socket === ws && ws.readyState === WebSocket.OPEN) {
                    try { ws.send('ping'); } catch { /* ignore */ }
                }
            }, HEARTBEAT_MS);
        };

        ws.onmessage = (event) => {
            if (socket !== ws || event.data === 'pong') return;
            try {
                const msg = JSON.parse(event.data);
                if (msg && msg.type === 'sync' && msg.source !== clientId && typeof syncHandler === 'function') {
                    syncHandler(msg);
                }
            } catch { /* ignore non-JSON frames */ }
        };

        ws.onclose = () => {
            if (socket !== ws) return;
            socket = null;
            clearTimers();
            if (desiredUrl) scheduleReconnect();
        };

        ws.onerror = () => {
            try { ws.close(); } catch { /* ignore */ }
        };
    }

    function connect(wsUrl, onRemoteSync) {
        if (!wsUrl) {
            disconnect();
            return;
        }
        if (desiredUrl === wsUrl && socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
            syncHandler = onRemoteSync;
            return;
        }
        desiredUrl = wsUrl;
        syncHandler = onRemoteSync;
        reconnectAttempt = 0;
        openSocket();
    }

    function disconnect() {
        desiredUrl = '';
        syncHandler = null;
        reconnectAttempt = 0;
        closeSocketOnly();
    }

    return { getClientId, connect, disconnect };
})();
