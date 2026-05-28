"""
ClipQ — Local web server on port 8000
Serves static files and provides an oEmbed proxy endpoint.
"""
import http.server
import json
import os
import re
import sys
import urllib.request
import urllib.parse
import urllib.error
import webbrowser

# Check/install/upgrade yt-dlp automatically on startup (only if not running as compiled EXE)
is_frozen = getattr(sys, 'frozen', False)
if not is_frozen:
    try:
        import subprocess
        print("Checking for yt-dlp updates...")
        # Attempt to upgrade yt-dlp using pip
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp"], 
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        import yt_dlp
        print("yt-dlp is up to date!")
    except Exception as e:
        # If the network request fails or upgrade fails, try importing the existing local installation
        try:
            import yt_dlp
            print("Update check failed (possibly offline), using locally installed version of yt-dlp.")
        except ImportError:
            print(f"Error: yt-dlp is not installed and automatic installation failed: {e}")
else:
    print("Running as compiled EXE. Skipping yt-dlp auto-update check.")
    try:
        import yt_dlp
        print("yt-dlp loaded successfully from bundle!")
    except ImportError:
        print("Error: yt-dlp could not be imported from bundle!")


PORT = 8000

if is_frozen and hasattr(sys, '_MEIPASS'):
    PUBLIC_DIR = os.path.join(sys._MEIPASS, 'public')
else:
    PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')


class ClipQHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # Health check endpoint
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

        # YouTube meta endpoint for datePublished
        if parsed.path == '/api/youtube-meta':
            params = urllib.parse.parse_qs(parsed.query)
            video_id = params.get('id', [None])[0]
            if not video_id:
                self.send_error(400, 'Missing id parameter')
                return
            try:
                url = f"https://www.youtube.com/watch?v={video_id}"
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0',
                    'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+478'
                })
                with urllib.request.urlopen(req, timeout=5) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')
                
                match = re.search(r'itemprop="datePublished" content="([^"]+)"', html)
                date = match.group(1) if match else ""
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'createdAt': date}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
            return

        # oEmbed proxy endpoint
        if parsed.path == '/api/oembed':
            params = urllib.parse.parse_qs(parsed.query)
            url = params.get('url', [None])[0]
            if not url:
                self.send_error(400, 'Missing url parameter')
                return
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'ClipQ/1.0'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = resp.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
            return

        # Proxy image endpoint to bypass CORS and Referrer checks
        if parsed.path == '/api/proxy-image':
            params = urllib.parse.parse_qs(parsed.query)
            url = params.get('url', [None])[0]
            if not url:
                self.send_error(400, 'Missing url parameter')
                return
            try:
                req = urllib.request.Request(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
                    'Referer': 'https://www.instagram.com/'
                })
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = resp.read()
                    content_type = resp.headers.get('Content-Type', 'image/jpeg')
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
            return

        # Video URL and Metadata extraction via yt-dlp
        if parsed.path == '/api/video-url':
            params = urllib.parse.parse_qs(parsed.query)
            url = params.get('url', [None])[0]
            if not url:
                self.send_error(400, 'Missing url parameter')
                return
            try:
                import yt_dlp
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'no_color': True,
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    direct_url = info.get('url')
                    duration = info.get('duration')
                    thumbnail = info.get('thumbnail')
                    title = info.get('title')
                    uploader = info.get('uploader')
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'url': direct_url,
                    'duration': duration,
                    'thumbnail': thumbnail,
                    'title': title,
                    'uploader': uploader
                }).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
            return

        # For SPA: serve index.html for paths without file extension
        if '.' not in os.path.basename(parsed.path) and parsed.path != '/':
            self.path = '/index.html'

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/log-error':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                print("\n[CLIENT ERROR]", json.dumps(data, indent=2))
            except Exception as e:
                print("\n[CLIENT ERROR LOG PARSE FAILED]", e, post_data)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return

    def log_message(self, format, *args):
        # Cleaner log output
        pass


def main():
    print(f'\n  ClipQ is running at http://localhost:{PORT}\n')
    try:
        webbrowser.open(f'http://localhost:{PORT}')
    except Exception as e:
        print(f"Could not open browser: {e}")
        
    server = http.server.HTTPServer(('', PORT), ClipQHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Server stopped.')
        server.server_close()


if __name__ == '__main__':
    main()
