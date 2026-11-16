"""Optional Vercel Python serverless endpoint for yt-dlp video URL extraction."""

import hmac
import json
import os
import urllib.parse
from http.server import BaseHTTPRequestHandler

ALLOWED_VIDEO_HOSTS = {
    'instagram.com',
    'www.instagram.com',
    'tiktok.com',
    'www.tiktok.com',
    'm.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
}


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


class handler(BaseHTTPRequestHandler):
    """Vercel serverless HTTP handler extracting direct video metadata via yt-dlp."""

    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        expected_secret = os.environ.get('YTDLP_PROXY_SECRET', '').strip()
        if expected_secret:
            provided = self.headers.get('X-ClipQ-Proxy-Secret', '')
            if not hmac.compare_digest(provided, expected_secret):
                self._send_json(403, {'error': 'Forbidden'})
                return

        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        raw_url = params.get('url', [None])[0]
        if not raw_url:
            self._send_json(400, {'error': 'Missing url parameter'})
            return

        safe_url = normalize_allowed_video_url(raw_url)
        if not safe_url:
            self._send_json(403, {'error': 'Unsupported video URL'})
            return

        try:
            import yt_dlp

            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'no_color': True,
                'socket_timeout': 8,
                'format': 'b[ext=mp4]/b/best[vcodec!=none][acodec!=none]/best',
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(safe_url, download=False) or {}
                direct_url = info.get('url')
                if not direct_url and info.get('entries'):
                    first = next((entry for entry in info['entries'] if entry), None)
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
        except Exception as exc:
            self._send_json(500, {'error': str(exc)})
