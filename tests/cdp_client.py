"""Minimal Chrome DevTools Protocol WebSocket client and browser locator."""

import base64
import json
import os
import socket
import struct


def find_browser_binary():
    """Locate Chrome or Edge executable on Windows, or return None if missing."""
    candidates = [
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Google', 'Chrome', 'Application', 'chrome.exe'),
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return None


class MinimalCDP:
    """Zero-dependency WebSocket client for headless Chromium DevTools."""

    def __init__(self, ws_url):
        if not ws_url.startswith('ws://'):
            raise ValueError(f'Unsupported WebSocket URL: {ws_url}')
        rest = ws_url[5:]
        host_port, path = rest.split('/', 1)
        host, port = host_port.split(':')
        self.sock = socket.create_connection((host, int(port)), timeout=15)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f'GET /{path} HTTP/1.1\r\n'
            f'Host: {host_port}\r\n'
            'Upgrade: websocket\r\n'
            'Connection: Upgrade\r\n'
            f'Sec-WebSocket-Key: {key}\r\n'
            'Sec-WebSocket-Version: 13\r\n\r\n'
        )
        self.sock.sendall(req.encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            buf += self.sock.recv(4096)
        self.msg_id = 0
        self.events = []

    def _send_frame(self, text):
        payload = text.encode('utf-8')
        mask = os.urandom(4)
        header = bytearray([0x81])
        length = len(payload)
        if length < 126:
            header.append(0x80 | length)
        elif length < 65536:
            header.append(0x80 | 126)
            header.extend(struct.pack('!H', length))
        else:
            header.append(0x80 | 127)
            header.extend(struct.pack('!Q', length))
        header.extend(mask)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(bytes(header) + masked)

    def _recv_exact(self, count):
        data = bytearray()
        while len(data) < count:
            chunk = self.sock.recv(count - len(data))
            if not chunk:
                raise EOFError('WebSocket closed')
            data.extend(chunk)
        return bytes(data)

    def _recv_frame(self):
        while True:
            b1, b2 = self._recv_exact(2)
            opcode = b1 & 0x0F
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack('!H', self._recv_exact(2))[0]
            elif length == 127:
                length = struct.unpack('!Q', self._recv_exact(8))[0]
            if b2 & 0x80:
                mask = self._recv_exact(4)
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(self._recv_exact(length)))
            else:
                payload = self._recv_exact(length)
            if opcode == 0x8:
                raise EOFError('Close frame')
            if opcode == 0x9:
                self.sock.sendall(b'\x8a\x80' + os.urandom(4))
                continue
            if opcode == 0x1:
                return json.loads(payload.decode('utf-8'))

    def call(self, method, params=None):
        """Send a CDP JSON-RPC command and await its matching response."""
        self.msg_id += 1
        cid = self.msg_id
        self._send_frame(json.dumps({'id': cid, 'method': method, 'params': params or {}}))
        while True:
            msg = self._recv_frame()
            if msg.get('id') == cid:
                if 'error' in msg:
                    raise RuntimeError(f"CDP error for {method}: {msg['error']}")
                return msg.get('result', {})
            self.events.append(msg)

    def eval_js(self, expr):
        """Evaluate a JavaScript expression in the active page context."""
        res = self.call('Runtime.evaluate', {'expression': expr, 'returnByValue': True, 'awaitPromise': True})
        if 'exceptionDetails' in res:
            raise RuntimeError(f"JS exception: {json.dumps(res['exceptionDetails'])}")
        return res.get('result', {}).get('value')

    def close(self):
        """Close the underlying TCP socket."""
        self.sock.close()
