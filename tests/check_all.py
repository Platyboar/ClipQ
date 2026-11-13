"""Unified all-in-one verification runner for ClipQ (linters, audit, HTTP, browser E2E)."""

import argparse
import os
import pathlib
import shutil
import subprocess
import sys
import traceback

sys.dont_write_bytecode = True

ROOT = pathlib.Path(__file__).resolve().parent.parent
if str(pathlib.Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from check_browser import run_browser_checks  # noqa: E402
from check_http import run_http_checks  # noqa: E402
from check_repo import run_repo_checks  # noqa: E402


def _build_env():
    """Return environment with Node.js directory appended to PATH if installed in Program Files."""
    env = os.environ.copy()
    env['PYTHONDONTWRITEBYTECODE'] = '1'
    node_dir = r'C:\Program Files\nodejs'
    if os.path.isdir(node_dir) and node_dir.lower() not in env.get('PATH', '').lower():
        env['PATH'] = f"{node_dir};{env.get('PATH', '')}"
    return env


def _local_bin(name, env):
    """Locate a binary inside node_modules/.bin first, falling back to PATH."""
    bin_dir = ROOT / 'node_modules' / '.bin'
    candidates = [bin_dir / f'{name}.cmd', bin_dir / name] if os.name == 'nt' else [bin_dir / name]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    resolved = shutil.which(name, path=env.get('PATH'))
    if resolved:
        return resolved
    raise FileNotFoundError(f'Required tool "{name}" not found. Run "npm install" in {ROOT} after installing Node.js.')


def _run_cmd(label, cmd, env):
    """Run an external tool command and fail clearly on non-zero exit."""
    print(f'\n--- [{label}] ---')
    proc = subprocess.run(cmd, cwd=str(ROOT), env=env, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f'{label} failed with exit code {proc.returncode}')
    print(f'[PASS] {label}')


def main():
    """Execute all linters, static checks, backend tests, and browser E2E checks."""
    parser = argparse.ArgumentParser(description='Run full ClipQ verification suite.')
    parser.add_argument('--quick', action='store_true', help='Skip headless Chromium browser E2E tests')
    args = parser.parse_args()

    env = _build_env()
    node_modules = ROOT / 'node_modules'
    if not node_modules.is_dir():
        raise RuntimeError(f'Missing {node_modules}. Run "npm install" in {ROOT} first.')

    _run_cmd('Ruff Lint', [sys.executable, '-m', 'ruff', 'check', 'app/server.py', 'build_exe.py', 'tests'], env)
    _run_cmd(
        'Ruff Format',
        [sys.executable, '-m', 'ruff', 'format', '--check', 'app/server.py', 'build_exe.py', 'tests'],
        env,
    )
    _run_cmd('ESLint', [_local_bin('eslint', env), '.'], env)
    _run_cmd('Stylelint', [_local_bin('stylelint', env), 'app/public/css/**/*.css'], env)
    _run_cmd('HTMLHint', [_local_bin('htmlhint', env), 'app/public/index.html'], env)

    print('\n--- [Repository & i18n Audit] ---')
    repo_res = run_repo_checks()
    print(repo_res)
    print('[PASS] Repository & i18n Audit')

    print('\n--- [Backend HTTP & SSRF Tests] ---')
    http_res = run_http_checks()
    print(http_res)
    print('[PASS] Backend HTTP & SSRF Tests')

    if args.quick:
        print('\n--- [Headless Browser E2E Tests: SKIPPED (--quick)] ---')
    else:
        print('\n--- [Headless Browser E2E Tests] ---')
        browser_res = run_browser_checks()
        print(browser_res)
        print('[PASS] Headless Browser E2E Tests')

    print('\n========================================')
    print('ALL CHECKS PASSED WITH 0 ERRORS')
    print('========================================')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        traceback.print_exc()
        print(f'\n[FAIL] {exc}', file=sys.stderr)
        sys.exit(1)
