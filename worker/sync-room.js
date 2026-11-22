/**
 * sync-room.js — Per-user Durable Object using WebSocket Hibernation for live Browser -> OBS push sync
 */

export class ClipQRoom {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        const reqUrl = new URL(request.url);

        if (reqUrl.pathname === '/notify' && request.method.toUpperCase() === 'POST') {
            const payload = await request.text();
            const sockets = this.state.getWebSockets();
            let delivered = 0;
            for (const ws of sockets) {
                try {
                    ws.send(payload);
                    delivered++;
                } catch {
                    try { ws.close(1011, 'Send failed'); } catch { /* ignore */ }
                }
            }
            return new Response(JSON.stringify({ ok: true, delivered }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });
        }

        if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
            return new Response('Expected WebSocket', { status: 426 });
        }

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];
        this.state.acceptWebSocket(server);
        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws, message) {
        if (message === 'ping') {
            try { ws.send('pong'); } catch { /* ignore */ }
        }
    }

    async webSocketClose(ws, code, reason) {
        try { ws.close(code, reason); } catch { /* ignore */ }
    }

    async webSocketError(ws) {
        try { ws.close(1011, 'WebSocket error'); } catch { /* ignore */ }
    }
}
