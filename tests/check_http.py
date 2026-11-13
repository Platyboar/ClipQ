"""Live HTTP, SSRF, and error-logging tests against ClipQServer."""

import http.client
import json
import pathlib
import re
import sys
import threading
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP_DIR = ROOT / 'app'


def _expect_http_error(url, expected_status, method='GET', data=None):
    req = urllib.request.Request(url, data=data, method=method)
    try:
        urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='replace')
        assert exc.code == expected_status, f'{url}: expected HTTP {expected_status}, got {exc.code} ({body})'
        return body
    raise AssertionError(f'{url}: expected HTTP {expected_status}, got 200')


def run_http_checks():
    """Spin up an ephemeral ClipQServer and verify every local route and SSRF guard."""
    sys.dont_write_bytecode = True
    if str(APP_DIR) not in sys.path:
        sys.path.insert(0, str(APP_DIR))
    import server as clipq_server

    html = (APP_DIR / 'public' / 'index.html').read_text(encoding='utf-8')
    ver_match = re.search(r'/css/settings\.css\?v=(\d+)', html)
    assert ver_match, 'Missing versioned /css/settings.css link in index.html'
    ver = ver_match.group(1)

    httpd = clipq_server.ClipQServer(('127.0.0.1', 0), clipq_server.ClipQHandler)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    try:
        base = f'http://127.0.0.1:{port}'

        with urllib.request.urlopen(f'{base}/', timeout=5) as resp:
            assert resp.status == 200
            assert b'ClipQ' in resp.read()

        with urllib.request.urlopen(f'{base}/health', timeout=5) as resp:
            assert resp.status == 200
            assert json.loads(resp.read().decode()) == {'ok': True}

        with urllib.request.urlopen(f'{base}/css/settings.css?v={ver}', timeout=5) as resp:
            assert resp.status == 200

        with urllib.request.urlopen(f'{base}/dashboard', timeout=5) as resp:
            assert resp.status == 200
            assert b'ClipQ' in resp.read()

        unknown_body = _expect_http_error(f'{base}/api/unknown', 404)
        assert json.loads(unknown_body) == {'error': 'Not found'}

        _expect_http_error(f'{base}/api/oembed', 400)
        _expect_http_error(f'{base}/api/video-url', 400)
        _expect_http_error(f'{base}/api/youtube-meta?id=bad!id', 400)
        _expect_http_error(f'{base}/api/youtube-meta', 400)

        for blocked_url in (
            f'{base}/api/oembed?url=http://127.0.0.1/evil',
            f'{base}/api/oembed?url=https://www.youtube.com:8443/oembed',
            f'{base}/api/video-url?url=http://169.254.169.254/latest',
            f'{base}/api/video-url?url=https://www.instagram.com:8443/reel/abc/',
            f'{base}/api/video-url?url=https://www.tiktok.com:8443/@u/video/1',
        ):
            _expect_http_error(blocked_url, 403)

        req_ok = urllib.request.Request(
            f'{base}/log-error',
            data=json.dumps({'message': 'check', 'source': 'check_http.py', 'lineno': 1, 'colno': 1}).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req_ok, timeout=5) as resp:
            assert resp.status == 200

        req_bad_json = urllib.request.Request(
            f'{base}/log-error',
            data=b'{not-json',
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req_bad_json, timeout=5) as resp:
            assert resp.status == 200

        conn = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
        try:
            conn.putrequest('POST', '/log-error')
            conn.putheader('Content-Type', 'application/json')
            conn.putheader('Content-Length', '70000')
            conn.endheaders()
            assert conn.getresponse().status == 413
        finally:
            conn.close()

        conn_bad_len = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
        try:
            conn_bad_len.putrequest('POST', '/log-error')
            conn_bad_len.putheader('Content-Length', 'invalid')
            conn_bad_len.endheaders()
            assert conn_bad_len.getresponse().status == 400
        finally:
            conn_bad_len.close()

        _expect_http_error(f'{base}/other', 404, method='POST', data=b'{}')
    finally:
        httpd.shutdown()
        httpd.server_close()

    return {'status': 'ok', 'endpoints_verified': 15}


if __name__ == '__main__':
    print(json.dumps(run_http_checks(), indent=2))
