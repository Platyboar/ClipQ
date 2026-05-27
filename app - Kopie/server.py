"""
ClipQ — Local web server on port 8000
Serves static files and provides an oEmbed proxy endpoint.
"""
import http.server
import json
import os
import urllib.request
import urllib.parse
import urllib.error

PORT = 8000
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
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
            return

        # For SPA: serve index.html for paths without file extension
        if '.' not in os.path.basename(parsed.path) and parsed.path != '/':
            self.path = '/index.html'

        super().do_GET()

    def log_message(self, format, *args):
        # Cleaner log output
        pass


def main():
    print(f'\n  ClipQ is running at http://localhost:{PORT}\n')
    server = http.server.HTTPServer(('', PORT), ClipQHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n  Server stopped.')
        server.server_close()


if __name__ == '__main__':
    main()
