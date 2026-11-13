"""Headless Chromium CDP end-to-end verification against live ClipQServer."""

import json
import pathlib
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

from browser_scenarios import (
    FUNCTIONAL_TEST_JS,
    MODAL_LANGS,
    assert_functional_report,
    assert_modal_report,
    modal_symmetry_js,
)
from cdp_client import MinimalCDP, find_browser_binary

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP_DIR = ROOT / 'app'

PRELOAD_JS = """
try {
    localStorage.setItem('clipq_token', 'mock_test_token');
    localStorage.setItem('clipq_user', JSON.stringify({
        id: '99999',
        login: 'teststreamer',
        displayName: 'TestStreamer',
        avatar: 'https://static-cdn.jtvnw.net/user-default-pictures-uv/de130ab0-def7-11e9-b668-784f43822e80-profile_image-70x70.png'
    }));
    if (!localStorage.getItem('clipq_language')) {
        localStorage.setItem('clipq_language', 'en');
    }
} catch {}
window.confirm = () => true;
window.alert = () => {};
const __origFetch = window.fetch.bind(window);
window.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('id.twitch.tv/oauth2/validate')) {
        return new Response(JSON.stringify({
            client_id: ClipQ.CLIENT_ID,
            login: 'teststreamer',
            user_id: '99999',
            scopes: ['chat:read']
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return __origFetch(url, opts);
};
window.__cdpErrors = [];
window.addEventListener('error', e => window.__cdpErrors.push('error: ' + e.message));
window.addEventListener('unhandledrejection', e => window.__cdpErrors.push('rejection: ' + (e.reason && e.reason.message || e.reason)));
"""


def _wait_for_cdp_ws(cdp_port):
    for _ in range(50):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{cdp_port}/json/list', timeout=1) as resp:
                pages = json.loads(resp.read().decode())
                for page in pages:
                    if page.get('type') == 'page':
                        return page['webSocketDebuggerUrl']
        except Exception:
            time.sleep(0.15)
    raise AssertionError('Headless browser CDP target did not become ready')


def _wait_for_app_ready(cdp):
    for _ in range(100):
        ready = cdp.eval_js(
            "Boolean(document.getElementById('app-screen') && !document.getElementById('app-screen').classList.contains('hidden'))"
        )
        if ready:
            return
        time.sleep(0.15)
    raise AssertionError('ClipQ did not transition to #app-screen')


def run_browser_checks():
    """Launch ephemeral server + headless Chromium, verify all UI flows, and clean up."""
    sys.dont_write_bytecode = True
    browser_bin = find_browser_binary()
    assert browser_bin, 'No Chrome or Edge browser executable found for CDP tests'

    if str(APP_DIR) not in sys.path:
        sys.path.insert(0, str(APP_DIR))
    import server as clipq_server

    httpd = clipq_server.ClipQServer(('127.0.0.1', 0), clipq_server.ClipQHandler)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    tmp_profile = tempfile.mkdtemp(prefix='clipq_cdp_')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        cdp_port = sock.getsockname()[1]

    browser = subprocess.Popen(
        [
            browser_bin,
            '--headless=new',
            f'--remote-debugging-port={cdp_port}',
            f'--user-data-dir={tmp_profile}',
            '--window-size=1366,768',
            '--no-first-run',
            '--no-default-browser-check',
            'about:blank',
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        cdp = MinimalCDP(_wait_for_cdp_ws(cdp_port))
        try:
            cdp.call('Runtime.enable')
            cdp.call('Page.enable')
            cdp.call(
                'Emulation.setDeviceMetricsOverride',
                {'width': 1366, 'height': 768, 'deviceScaleFactor': 1, 'mobile': False},
            )

            # Verify unauthenticated login screen gradient styling before seeding token
            cdp.call('Page.navigate', {'url': f'http://127.0.0.1:{port}/'})
            time.sleep(0.3)
            logo_clip = cdp.eval_js("getComputedStyle(document.querySelector('.login-logo')).backgroundClip")
            assert logo_clip == 'text', f'Expected background-clip:text on .login-logo, got {logo_clip!r}'

            cdp.call('Page.addScriptToEvaluateOnNewDocument', {'source': PRELOAD_JS})
            cdp.call('Page.navigate', {'url': f'http://127.0.0.1:{port}/'})
            _wait_for_app_ready(cdp)

            header_clip = cdp.eval_js("getComputedStyle(document.querySelector('.menu-left h1')).backgroundClip")
            assert header_clip == 'text', f'Expected background-clip:text on header title, got {header_clip!r}'

            cdp.eval_js(
                "document.getElementById('user-menu-toggle').click(); document.getElementById('dropdown-settings').click();"
            )

            modal_report = {}
            for lang in MODAL_LANGS:
                modal_report[f'1366x768_{lang}'] = cdp.eval_js(modal_symmetry_js(lang, check_widths=True))

            for vw, vh in ((1920, 1080), (700, 768)):
                cdp.call(
                    'Emulation.setDeviceMetricsOverride',
                    {'width': vw, 'height': vh, 'deviceScaleFactor': 1, 'mobile': False},
                )
                for lang in ('en', 'ru'):
                    modal_report[f'{vw}x{vh}_{lang}'] = cdp.eval_js(modal_symmetry_js(lang, check_widths=False))
            assert_modal_report(modal_report)

            cdp.call(
                'Emulation.setDeviceMetricsOverride',
                {'width': 1366, 'height': 768, 'deviceScaleFactor': 1, 'mobile': False},
            )
            cdp.eval_js("ClipQ.I18n.setLanguage('en'); ClipQ.I18n.applyToDOM();")

            func_report = cdp.eval_js(FUNCTIONAL_TEST_JS)
            assert_functional_report(func_report)

            cdp.eval_js("""
                localStorage.setItem('clipq_language', 'ru');
                localStorage.setItem('clipq_history', JSON.stringify([
                    {
                        id: 'legacy_1',
                        provider: 'twitch',
                        clipId: 'OldClipSlug',
                        url: 'https://www.twitch.tv/oldchan/clip/OldClipSlug"du?range=7d',
                        meta: { title: 'du test', channel: 'oldchan' },
                        watchedAt: Date.now()
                    },
                    {
                        provider: 'youtube',
                        clipId: 'dQw4w9WgXcQ',
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        meta: { title: 'no id legacy', channel: 'yt' },
                        watchedAt: Date.now()
                    }
                ]));
            """)
            cdp.call('Page.reload', {'ignoreCache': True})
            _wait_for_app_ready(cdp)
            reload_state = cdp.eval_js(
                "[ClipQ.I18n.getLanguage(), document.documentElement.lang, ClipQ.Queue.getHistory()[0]?.url, Boolean(ClipQ.Queue.getHistory()[1]?.id), window.__cdpErrors]"
            )
            assert reload_state == [
                'ru',
                'ru',
                'https://www.twitch.tv/oldchan/clip/OldClipSlug',
                True,
                [],
            ], f'Reload persistence check failed: {reload_state}'
        finally:
            cdp.close()
    finally:
        browser.terminate()
        try:
            browser.wait(timeout=3)
        except Exception:
            browser.kill()
        httpd.shutdown()
        httpd.server_close()
        shutil.rmtree(tmp_profile, ignore_errors=True)

    return {'status': 'ok', 'locales_modal_checked': len(MODAL_LANGS), 'runtime_errors': 0}


if __name__ == '__main__':
    print(json.dumps(run_browser_checks(), indent=2))
