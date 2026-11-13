"""Static repository, AGENTS.md hygiene, HTML/CSS/JS, and i18n checks for ClipQ."""

import ast
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP_DIR = ROOT / 'app'
PUBLIC_DIR = APP_DIR / 'public'

SKIP_DIRS = {'.git', 'node_modules', 'dist', 'build', '.gemini', 'scratch', '__pycache__'}
EXEMPT_SIZE_AND_EOL = {'tmi.min.js', 'package-lock.json', 'desktop.ini'}
TEXT_EXTS = {'.py', '.js', '.mjs', '.css', '.html', '.md', '.bat', '.json', '.toml'}
NAMED_TEXT_FILES = {'.gitattributes', '.gitignore', '.htmlhintrc', 'LICENSE'}
INDENT_EXTS = {'.py', '.js', '.mjs', '.html'}
KEBAB_FILE_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z]+$')
SNAKE_PY_RE = re.compile(r'^[a-z0-9_]+\.py$')


def _strip_css_blocks(css_text):
    """Return CSS text containing only selectors and at-rule headers (without property blocks)."""
    no_comments = re.sub(r'/\*.*?\*/', '', css_text, flags=re.S)
    depth = 0
    out = []
    for ch in no_comments:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth = max(0, depth - 1)
            out.append(' ')
        elif depth == 0:
            out.append(ch)
    return ''.join(out)


def _check_indentation(rel_path, lines, issues):
    """Verify no tabs and 4-space indentation on Python, JS, and HTML files."""
    if any('\t' in line for line in lines):
        issues.append(f'{rel_path}: tab character found')
    if rel_path.suffix not in INDENT_EXTS:
        return

    in_multiline_comment = False
    for line_no, line in enumerate(lines, 1):
        stripped = line.lstrip(' ')
        if not stripped:
            continue
        if rel_path.suffix in {'.js', '.mjs'}:
            if in_multiline_comment:
                if '*/' in stripped:
                    in_multiline_comment = False
                continue
            if stripped.startswith('/*') and '*/' not in stripped:
                in_multiline_comment = True
                continue
        indent = len(line) - len(stripped)
        if indent % 4 != 0:
            issues.append(f'{rel_path}:{line_no}: indentation {indent} is not a multiple of 4')


def check_file_hygiene():
    """Verify file size limits, UTF-8 without BOM, LF/CRLF, naming, and no __pycache__."""
    issues = []
    checked = 0

    for root_dir in ROOT.rglob('__pycache__'):
        if '.git' not in root_dir.parts and 'node_modules' not in root_dir.parts:
            issues.append(f'__pycache__ directory found: {root_dir.relative_to(ROOT)}')

    for path in sorted(ROOT.rglob('*')):
        if any(part in SKIP_DIRS for part in path.parts) or not path.is_file():
            continue
        if path.name in EXEMPT_SIZE_AND_EOL:
            continue
        rel = path.relative_to(ROOT)

        if path.suffix == '.py':
            if not SNAKE_PY_RE.match(path.name):
                issues.append(f'{rel}: Python filename must be snake_case')
            ast.parse(path.read_text(encoding='utf-8'), filename=str(rel))

        if (
            path.is_relative_to(APP_DIR)
            and path.suffix in {'.html', '.css', '.js'}
            and not KEBAB_FILE_RE.match(path.name)
        ):
            issues.append(f'{rel}: web asset filename must be lowercase kebab-case')

        if path.suffix not in TEXT_EXTS and path.name not in NAMED_TEXT_FILES:
            continue

        checked += 1
        raw = path.read_bytes()
        if raw.startswith(b'\xef\xbb\xbf'):
            issues.append(f'{rel}: UTF-8 BOM not allowed')

        try:
            text = raw.decode('utf-8')
        except UnicodeDecodeError as exc:
            issues.append(f'{rel}: invalid UTF-8 ({exc})')
            continue

        has_crlf = b'\r\n' in raw
        if path.suffix == '.bat':
            if not has_crlf:
                issues.append(f'{rel}: .bat file must use CRLF line endings')
        elif has_crlf:
            issues.append(f'{rel}: CRLF found (expected LF)')

        if text and not text.endswith('\n'):
            issues.append(f'{rel}: missing trailing newline')
        if text.endswith('\n\n'):
            issues.append(f'{rel}: multiple trailing newlines')

        lines = text.splitlines()
        if len(lines) > 500:
            issues.append(f'{rel}: {len(lines)} lines exceeds 500-line limit')

        trailing_ws = [idx + 1 for idx, ln in enumerate(lines) if ln != ln.rstrip(' \t')]
        if trailing_ws:
            issues.append(f'{rel}: trailing whitespace on lines {trailing_ws[:5]}')

        _check_indentation(rel, lines, issues)

    return checked, issues


def check_html_and_assets():
    """Verify index.html IDs, buttons, links, labels, script load order, and cache-busting."""
    issues = []
    html = (PUBLIC_DIR / 'index.html').read_text(encoding='utf-8')

    html_ids = re.findall(r'\bid="([^"]+)"', html)
    dup_ids = sorted({item for item in html_ids if html_ids.count(item) > 1})
    if dup_ids:
        issues.append(f'Duplicate HTML IDs: {dup_ids}')

    for btn in re.findall(r'<button\b[^>]*>', html, re.S):
        if 'type="' not in btn:
            issues.append(f'index.html: button missing type=: {btn}')

    for link in re.findall(r'<a\b[^>]*target="_blank"[^>]*>', html, re.S):
        if 'noopener' not in link or 'noreferrer' not in link:
            issues.append(f'index.html: unsafe target=_blank link: {link}')

    id_set = set(html_ids)
    for target in re.findall(r'<label\b[^>]*\bfor="([^"]+)"', html):
        if target not in id_set:
            issues.append(f'index.html: <label for="{target}"> target missing')

    local_assets = re.findall(r'(?:href|src)="(/(?:css|js)/[^"]+)"', html)
    ver_tags = set()
    script_order = []
    for asset in local_assets:
        if asset == '/js/tmi.min.js':
            continue
        match = re.search(r'\?v=(\d+)$', asset)
        if not match:
            issues.append(f'index.html: local asset missing ?v=N query string: {asset}')
        else:
            ver_tags.add(match.group(1))
        if asset.startswith('/js/'):
            script_order.append(asset.split('?', 1)[0])

    if len(ver_tags) != 1:
        issues.append(f'index.html: inconsistent cache-busting versions: {sorted(ver_tags)}')

    if (
        len(script_order) < 3
        or script_order[0] != '/js/utils.js'
        or script_order[1] != '/js/i18n.js'
        or script_order[-1] != '/js/app.js'
    ):
        issues.append(f'index.html: invalid script dependency order: {script_order}')

    return html, id_set, sorted(ver_tags), issues


def check_js_and_css(html, html_ids):
    """Verify JS exports, DOM ID targets, try/catch safety, and CSS var/class/ID coverage."""
    issues = []
    js_root = PUBLIC_DIR / 'js'
    core_js_files = sorted(p for p in js_root.glob('*.js') if p.name != 'tmi.min.js')
    lang_js_files = sorted((js_root / 'lang').glob('*.js'))

    core_contents = {p.name: p.read_text(encoding='utf-8') for p in core_js_files}
    lang_contents = {p.name: p.read_text(encoding='utf-8') for p in lang_js_files}
    all_js = '\n'.join(core_contents.values()) + '\n' + '\n'.join(lang_contents.values())

    all_ids = set(html_ids)
    all_ids |= set(re.findall(r'\bid=["\']([^"\']+)["\']', all_js))
    all_ids |= set(re.findall(r'\bid=([a-zA-Z0-9_-]+)', all_js))

    for fname, src in core_contents.items():
        if "'use strict';" not in src:
            issues.append(f'{fname}: missing "use strict";')

        for match in re.finditer(r"getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)", src):
            target = match.group(1)
            if target not in all_ids:
                issues.append(f'{fname}: missing DOM target #{target}')

        for match in re.finditer(r'<button\b[^>]*>', src):
            if 'type=' not in match.group(0):
                issues.append(f'{fname}: template button missing type=: {match.group(0)}')

        for match in re.finditer(r'<a\b[^>]*target=["\']_blank["\'][^>]*>', src):
            if 'noopener' not in match.group(0) or 'noreferrer' not in match.group(0):
                issues.append(f'{fname}: unsafe target=_blank in template: {match.group(0)}')

        lines = src.splitlines()
        for line_no, line in enumerate(lines, 1):
            stripped = line.lstrip()
            if stripped.startswith(('//', '/*', '*')):
                continue
            if 'localStorage.setItem' in line or 'JSON.parse' in line:
                window = '\n'.join(lines[max(0, line_no - 5) : line_no + 2])
                if 'try' not in window:
                    issues.append(f'{fname}:{line_no}: unguarded localStorage.setItem / JSON.parse')

        ns_match = re.search(r'(ClipQ\.[A-Z]\w+)\s*=\s*\(', src)
        ns = ns_match.group(1) if ns_match else 'ClipQ'
        ret_match = re.search(r'return\s*\{([^}]+)\}\s*;\s*\}\)\(\)\s*;', src, re.S)
        if ret_match:
            syms = [s.strip().split(':')[0].strip() for s in ret_match.group(1).split(',') if s.strip()]
            for sym in syms:
                full = f'{ns}.{sym}'
                if len(re.findall(r'\b' + re.escape(full) + r'\b', all_js + '\n' + html)) == 0:
                    issues.append(f'{fname}: unused export {full}')

    css_files = sorted((PUBLIC_DIR / 'css').glob('*.css'))
    all_css = '\n'.join(p.read_text(encoding='utf-8') for p in css_files)
    defined_vars = set(re.findall(r'(--[a-z0-9-]+)\s*:', all_css))
    used_vars = set(re.findall(r'var\((--[a-z0-9-]+)\)', all_css)) | set(re.findall(r'--[a-z0-9-]+', all_js))

    for var in sorted(defined_vars - used_vars):
        issues.append(f'Unused CSS variable: {var}')
    for var in sorted(used_vars - defined_vars):
        issues.append(f'Undefined CSS variable: {var}')

    design_vars = set(re.findall(r"'(--color-[a-z0-9-]+)'", core_contents.get('design.js', '')))
    for var in sorted(design_vars - defined_vars):
        issues.append(f'design.js color variable not declared in CSS: {var}')

    for css_path in css_files:
        selectors = _strip_css_blocks(css_path.read_text(encoding='utf-8'))
        for cls in sorted(set(re.findall(r'\.([a-z][a-z0-9_-]*)', selectors))):
            if cls not in html and cls not in all_js:
                issues.append(f'{css_path.name}: unused CSS class .{cls}')
        for cid in sorted(set(re.findall(r'#([a-z][a-z0-9_-]*)', selectors))):
            if cid not in all_ids:
                issues.append(f'{css_path.name}: unused CSS ID #{cid}')

    return lang_contents, all_js, issues


def check_i18n(html, all_core_js, lang_contents):
    """Verify all 8 locales have identical keys, matching placeholders, and no unused keys."""
    issues = []
    locales = {}
    placeholders = {}

    for fname, txt in sorted(lang_contents.items()):
        keys = re.findall(r"^\s*(?:'([^']+)'|(_[a-z]+))\s*:", txt, re.M)
        counts = {}
        for k1, k2 in keys:
            key = k1 or k2
            counts[key] = counts.get(key, 0) + 1
        dups = {k: v for k, v in counts.items() if v > 1}
        if dups:
            issues.append(f'{fname}: duplicate i18n keys {dups}')
        locales[fname] = set(counts.keys())

        ph_map = {}
        for line in txt.splitlines():
            match = re.match(r"^\s*'([^']+)'\s*:\s*(.+)$", line)
            if match:
                ph_map[match.group(1)] = sorted(re.findall(r'\{([a-zA-Z0-9_]+)\}', match.group(2)))
        placeholders[fname] = ph_map

    base_keys = locales.get('en.js', set())
    if len(locales) != 8:
        issues.append(f'Expected 8 locale files, found {len(locales)}')

    for fname, keys in locales.items():
        if keys != base_keys:
            issues.append(f'{fname}: key mismatch missing={sorted(base_keys - keys)} extra={sorted(keys - base_keys)}')
        for key, en_phs in placeholders.get('en.js', {}).items():
            if placeholders[fname].get(key) != en_phs:
                issues.append(f'{fname}: placeholder mismatch on {key}: {en_phs} vs {placeholders[fname].get(key)}')

    used_keys = set(re.findall(r'data-i18n(?:-[a-z]+)?="([^"]+)"', html))
    used_keys |= set(re.findall(r"\bt\(\s*'([^']+)'", all_core_js))
    for key in sorted(base_keys):
        if key.startswith('_') or key in used_keys or key in all_core_js or key in html:
            continue
        prefix, suffix = key.rsplit('.', 1)
        if (
            f'{prefix}.`' in all_core_js
            or f"'{prefix}.'" in all_core_js
            or f'{prefix}.${{' in all_core_js
            or suffix in all_core_js
        ):
            continue
        issues.append(f'Unused i18n key: {key}')

    return len(locales), len(base_keys), issues


def run_repo_checks():
    """Run all static AGENTS.md repository checks and assert zero violations."""
    checked, file_issues = check_file_hygiene()
    html, html_ids, ver_tags, html_issues = check_html_and_assets()
    lang_contents, _, asset_issues = check_js_and_css(html, html_ids)
    core_only_js = '\n'.join(
        p.read_text(encoding='utf-8') for p in sorted((PUBLIC_DIR / 'js').glob('*.js')) if p.name != 'tmi.min.js'
    )
    locale_count, en_keys_count, i18n_issues = check_i18n(html, core_only_js, lang_contents)

    all_issues = file_issues + html_issues + asset_issues + i18n_issues
    assert not all_issues, 'Repository audit failed:\n- ' + '\n- '.join(all_issues)

    return {
        'status': 'ok',
        'checked_files': checked,
        'locales': locale_count,
        'en_keys': en_keys_count,
        'cache_version': ver_tags[0],
    }


if __name__ == '__main__':
    print(json.dumps(run_repo_checks(), indent=2))
