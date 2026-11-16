# ClipQ 🎬

**ClipQ** is a lightweight Clip Queue for Twitch streamers. Viewers submit clips via chat commands and the streamer watches them in order — with full control over the queue.
Developed with the help of Google Antigravity.

## 🌐 Use Online (No Installation Required)

**Live Web App:** **https://clipq.platyboar.workers.dev/**

- Open the URL directly in your browser — no download, Python setup, or extra account required.
- Sign in using **Connect with Twitch** only.
- When using the online version, your settings, design, layout, clip memory, and unlimited clip history are persisted in the EU (Cloudflare D1) under your Twitch User ID, with JSON export and one-click server data deletion under **Settings → General**.

> Prefer running everything on your own machine? You can also self-host ClipQ locally using the Windows executable or Python source instructions below.

## Features

- 🎬 **Multi-Platform Clips** — Twitch, YouTube, TikTok, and Instagram clips
- 💬 **Chat Integration** — Viewers submit clips by pasting links in chat
- 🔧 **Chat Commands** — Moderators (and configurable roles) can control the queue via chat
- 🛡️ **Role-Based Permissions** — Configure which roles (Broadcaster, Lead Mod, Mod, VIP, All) can use each command
- 🌍 **Multi-Language** — English, German, Spanish, Russian, Portuguese, French, Japanese, and Italian included (Spanish, Russian, Portuguese, French, Japanese, and Italian were translated using AI; easily extendable)
- 🎨 **Customizable Design & Layout** — Colors, fonts, and layout (component ordering, sidebar position, info bar placement, and component visibility) are fully customizable and can be saved as defaults
- 📋 **Clip Memory** — Prevents duplicate clips from being re-queued
- 📜 **History** — Browse previously watched clips
- 💾 **Data Export & Deletion** — Export backups as JSON or delete stored online data anytime
- 🚫 **Moderation** — Blocked users/streamers, auto-removal on timeout/ban
- ◀️ **Autoplay** — Automatically advance to the next clip

## Getting Started (Local Self-Hosting)

### Standalone Executable (Windows)

No installation, Python, or external dependencies are required to run ClipQ as a standalone application on Windows.

1. **Download the latest release**: Go to the GitHub Releases section and download `ClipQ.exe`.
2. **Run `ClipQ.exe`**: Double-click the file.
   - It will automatically launch the local web server.
   - It will open your default web browser to `http://localhost:8000`.
3. **Connect with Twitch** and start managing your clip queue!

---

### Running from Source / Development

If you prefer to run ClipQ from source or are on a non-Windows platform:

#### Prerequisites

- [Python 3.8+](https://www.python.org/downloads/) (with `pip`)
  > **Note for Windows source users:** Running the app via `app/start.bat` will automatically verify your Python installation. If Python is missing or older than 3.8, it will silently download and install Python 3.12 for you.
- A [Twitch account](https://www.twitch.tv/)

#### Installation & Startup

1. **Download or clone** this repository:
   ```bash
   git clone https://github.com/Platyboar/ClipQ.git
   cd ClipQ
   ```

2. **Start the server:**
   ```bash
   cd app
   python server.py
   ```
   Or simply double-click `app/start.bat` on Windows (`app/start-server.bat` or `python server.py --no-browser` restarts only the server without opening another browser tab; `app/update-ytdlp.bat` or `python server.py --update` updates `yt-dlp`).

3. **Open in your browser:**
   Open `http://localhost:8000` in your web browser.

## Chat Commands

All commands use a configurable prefix (default: `!clipq`).

| Command | Description | Default Roles |
|---------|-------------|---------------|
| `!clipq next` | Play next clip | Broadcaster, Lead Mod, Mod |
| `!clipq push [url]` | Push a clip to #1 in queue | Broadcaster, Lead Mod, Mod |
| `!clipq open` | Open the queue for submissions | Broadcaster, Lead Mod, Mod |
| `!clipq close` | Close the queue | Broadcaster, Lead Mod, Mod |
| `!clipq clear` | Clear the entire queue | Broadcaster, Lead Mod, Mod |
| `!clipq purgememory` | Clear the clip memory | Broadcaster, Lead Mod, Mod |
| `!clipq autoplay on/off` | Toggle autoplay | Broadcaster, Lead Mod, Mod |
| `!clipq limit [n]` | Set per-user clip limit | Broadcaster, Lead Mod, Mod |
| `!clipq remove <url \| all \| user>` | Remove a clip by URL, a user's clips, or all own clips (`all`) | Broadcaster, Lead Mod, Mod* |
| `!clipq providers [name] on/off` | Enable/disable a clip provider | Broadcaster, Lead Mod, Mod |

*\* Regular users can always remove their own submitted clips via `all`, their own username, or a specific URL.*

## Adding a New Language

1. Create a new file in `app/public/js/lang/` (e.g., `es.js` for Spanish)
2. Copy the structure from `en.js` or `de.js`
3. Translate all strings
4. Register the new script tag in `app/public/index.html` after `js/i18n.js`
5. The language will then appear in the settings dropdown

## Tech Stack

- **Web Hosting & Sync:** Cloudflare Workers + Cloudflare D1 (EU) + optional Vercel Python Serverless (`yt-dlp`)
- **Local Backend:** Python (`http.server` + `yt-dlp`)
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Chat:** [tmi.js](https://tmijs.com/) (Twitch IRC)
- **Auth:** Twitch OAuth Implicit Grant Flow

## Changelog

### v1.1.0

- 📐 **Advanced Layout Controls** — Adjust component heights (Facecam, Queue) with individual lock controls and smart auto-distribution of space.
- 🔀 **Dynamic Reordering** — Reorder sidebar elements (Facecam, Chat + Ad, Queue) between Top, Middle, and Bottom slots.
- 📺 **Read-only Channel & Logout** — Channel name in settings is now read-only and styled as prominent text, with an adjacent "Logout" button.
- 🛡️ **Clip Memory Bypass** — Selectively allow Lead Mods and/or Mods to bypass Clip Memory restrictions.
- 💬 **Strict Space-Separated Commands** — Commands now strictly require a whitespace after the prefix (e.g. `!queue next` works, while `!queuenext` is ignored).
- 🌍 **Fully Localized Design & Layout** — Modal width increased to 780px to accommodate text-heavy languages, with automatic translation of design color swatches, tooltips, and layout options.
- 🧩 **Smart Sidebar Auto-Hide** — The entire sidebar hides cleanly if all its sub-components are disabled.
- 🛠️ **Refactoring & Fixes** — Consolidated redundant settings code, resolved console warnings (`substr` replacement), and fixed `{count}` i18n substitution issues.

## License

This project is licensed under the [MIT License](LICENSE).
