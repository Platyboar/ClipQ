"""
ClipQ - Local web server on port 8000.
Serves static files and provides metadata/oEmbed/video extraction endpoints.
"""

import http.server
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

PORT = 8000
MAX_LOG_BYTES = 65536
MAX_OEMBED_BYTES = 1048576
MAX_HTML_META_BYTES = 8 * 1024 * 1024

ALLOWED_OEMBED_HOSTS = {'youtube.com', 'www.youtube.com', 'tiktok.com', 'www.tiktok.com'}
ALLOWED_VIDEO_HOSTS = {
    'instagram.com',
    'www.instagram.com',
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
}
YOUTUBE_ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,32}$')
TWITCH_CLIP_ID_RE = re.compile(r'^[A-Za-z0-9_-]{1,128}$')
TWITCH_VOD_ID_RE = re.compile(r'^\d{1,32}$')

IS_FROZEN = getattr(sys, 'frozen', False)


def ensure_yt_dlp():
    """Ensure yt-dlp is importable (installing on demand when running from source)."""
    if IS_FROZEN:
        print('Running as compiled EXE. Skipping yt-dlp install check.')
        try:
            import yt_dlp

            print('yt-dlp loaded successfully from bundle!')
        except ImportError:
            print('Error: yt-dlp could not be imported from bundle!')
        return

    if '--update' in sys.argv:
        try:
            print('Updating yt-dlp...')
            subprocess.check_call(
                [sys.executable, '-m', 'pip', 'install', '--upgrade', 'yt-dlp'],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            print('yt-dlp updated successfully.')
        except Exception as e:
            print(f'yt-dlp update failed: {e}')

    try:
        import yt_dlp
    except ImportError:
        try:
            print('yt-dlp not found. Installing yt-dlp...')
            subprocess.check_call(
                [sys.executable, '-m', 'pip', 'install', 'yt-dlp'],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            import yt_dlp  # noqa: F401

            print('yt-dlp installed successfully!')
        except Exception as e:
            print(f'Error: yt-dlp is not installed and automatic installation failed: {e}')


if IS_FROZEN and hasattr(sys, '_MEIPASS'):
    PUBLIC_DIR = os.path.join(sys._MEIPASS, 'public')
else:
    PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')


def is_allowed_oembed_url(url):
    """Validate that an oEmbed target URL points to an allowed HTTPS oEmbed endpoint."""
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return False
    return (
        parsed.scheme == 'https'
        and (parsed.hostname or '').lower() in ALLOWED_OEMBED_HOSTS
        and parsed.port in (None, 443)
        and parsed.path.rstrip('/') == '/oembed'
    )


def normalize_allowed_video_url(url):
    """Validate and normalize a video extraction URL to an allowlisted HTTPS URL, or return None."""
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return None
    if (
        parsed.scheme not in ('http', 'https')
        or (parsed.hostname or '').lower() not in ALLOWED_VIDEO_HOSTS
        or parsed.port is not None
    ):
        return None
    return parsed._replace(scheme='https').geturl()


class SafeOEmbedRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Block redirects to non-allowlisted hosts or non-HTTPS schemes."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not is_allowed_oembed_url(newurl):
            raise urllib.error.HTTPError(newurl, code, 'Blocked unsafe redirect', headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OEMBED_OPENER = urllib.request.build_opener(SafeOEmbedRedirectHandler())


class ClipQServer(http.server.ThreadingHTTPServer):
    """Multi-threaded HTTP server for serving ClipQ static assets and local APIs."""

    daemon_threads = True
    allow_reuse_address = True


class ClipQHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler serving static files and ClipQ metadata endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # Health check endpoint
        if parsed.path == '/health':
            self._send_json(200, {'ok': True})
            return

        # YouTube meta endpoint for datePublished
        if parsed.path == '/api/youtube-meta':
            params = urllib.parse.parse_qs(parsed.query)
            video_id = params.get('id', [None])[0]
            if not video_id or not YOUTUBE_ID_RE.fullmatch(video_id):
                self._send_json(400, {'error': 'Invalid or missing id parameter'})
                return
            try:
                url = f'https://www.youtube.com/watch?v={video_id}'
                req = urllib.request.Request(
                    url,
                    headers={
                        'User-Agent': 'Mozilla/5.0',
                        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478',
                    },
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    html = resp.read(MAX_HTML_META_BYTES).decode('utf-8', errors='ignore')

                match = re.search(r'itemprop="datePublished" content="([^"]+)"', html)
                date = match.group(1) if match else ''
                self._send_json(200, {'createdAt': date})
            except urllib.error.HTTPError as e:
                self._send_json(502, {'error': f'Upstream HTTP {e.code}'})
            except Exception as e:
                self._send_json(500, {'error': str(e)})
            return

        # oEmbed proxy endpoint (restricted to allowlisted HTTPS oEmbed endpoints)
        if parsed.path == '/api/oembed':
            params = urllib.parse.parse_qs(parsed.query)
            url = params.get('url', [None])[0]
            if not url:
                self._send_json(400, {'error': 'Missing url parameter'})
                return
            if not is_allowed_oembed_url(url):
                self._send_json(403, {'error': 'Unsupported oEmbed URL'})
                return
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'ClipQ/1.0'})
                with OEMBED_OPENER.open(req, timeout=5) as resp:
                    data = resp.read(MAX_OEMBED_BYTES)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            except urllib.error.HTTPError as e:
                self._send_json(502, {'error': f'Upstream HTTP {e.code}'})
            except Exception as e:
                self._send_json(500, {'error': str(e)})
            return

        # Video URL and metadata extraction via yt-dlp (restricted to allowlisted video hosts)
        if parsed.path == '/api/video-url':
            params = urllib.parse.parse_qs(parsed.query)
            url = params.get('url', [None])[0]
            if not url:
                self._send_json(400, {'error': 'Missing url parameter'})
                return
            safe_url = normalize_allowed_video_url(url)
            if not safe_url:
                self._send_json(403, {'error': 'Unsupported video URL'})
                return
            try:
                import yt_dlp

                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'no_color': True,
                    'socket_timeout': 10,
                    'format': 'b[ext=mp4]/b/best[vcodec!=none][acodec!=none]/best',
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(safe_url, download=False) or {}
                    direct_url = info.get('url')
                    if not direct_url and info.get('entries'):
                        first = next((e for e in info['entries'] if e), None)
                        if isinstance(first, dict):
                            info = first
                            direct_url = info.get('url')
                    payload = {
                        'id': info.get('id'),
                        'url': direct_url,
                        'duration': info.get('duration'),
                        'thumbnail': info.get('thumbnail'),
                        'title': info.get('title'),
                        'uploader': info.get('uploader'),
                        'uploader_url': info.get('uploader_url'),
                        'channel': info.get('channel'),
                        'channel_url': info.get('channel_url'),
                        'webpage_url': info.get('webpage_url'),
                    }
                self._send_json(200, payload)
            except urllib.error.HTTPError as e:
                self._send_json(502, {'error': f'Upstream HTTP {e.code}'})
            except Exception as e:
                self._send_json(500, {'error': str(e)})
            return

        if parsed.path == '/api/twitch-meta':
            params = urllib.parse.parse_qs(parsed.query)
            meta_type = (params.get('type', [''])[0] or '').strip().lower()
            meta_id = (params.get('id', [''])[0] or '').strip()
            if meta_type == 'clip' and not TWITCH_CLIP_ID_RE.fullmatch(meta_id):
                self._send_json(400, {'error': 'Invalid or missing clip id'})
                return
            if meta_type in ('vod', 'badges') and not TWITCH_VOD_ID_RE.fullmatch(meta_id):
                self._send_json(400, {'error': f'Invalid or missing {meta_type} id'})
                return
            if meta_type not in ('clip', 'vod', 'badges'):
                self._send_json(400, {'error': 'Invalid type parameter'})
                return
            if meta_type == 'badges':
                self._send_json(200, {'configured': False, 'badges': None})
                return
            self._send_json(200, {'configured': False, 'available': True, 'meta': None})
            return

        if parsed.path.startswith('/api/'):
            self._send_json(404, {'error': 'Not found'})
            return

        # For SPA: serve index.html for paths without file extension
        if '.' not in os.path.basename(parsed.path) and parsed.path != '/':
            self.path = '/index.html'

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != '/log-error':
            self._send_json(404, {'error': 'Not found'})
            return

        try:
            content_length = int(self.headers.get('Content-Length', ''))
        except (TypeError, ValueError):
            self._send_json(400, {'error': 'Invalid Content-Length'})
            return

        if content_length < 0 or content_length > MAX_LOG_BYTES:
            self._send_json(413, {'error': 'Payload too large'})
            return

        post_data = self.rfile.read(content_length)
        try:
            data = json.loads(post_data.decode('utf-8'))
            print('\n[CLIENT ERROR]', json.dumps(data, indent=2))
        except Exception as e:
            print('\n[CLIENT ERROR LOG PARSE FAILED]', e, post_data)

        self._send_json(200, {'ok': True})

    def log_message(self, format, *args):
        # Cleaner log output
        pass


def main():
    """Start the local ClipQ HTTP server and optionally open the UI in the default browser."""
    ensure_yt_dlp()
    print(f'\n  ClipQ is running at http://localhost:{PORT}\n')
    if '--no-browser' not in sys.argv:
        try:
            webbrowser.open(f'http://localhost:{PORT}')
        except Exception as e:
            print(f'Could not open browser: {e}')

    server = ClipQServer(('', PORT), ClipQHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Server stopped.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
