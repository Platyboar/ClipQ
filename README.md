# ClipQ 🎬

**ClipQ** is a lightweight Clip Queue for Twitch streamers. Viewers submit clips via chat commands and the streamer watches them in order — with full control over the queue.
Developed with the help of Google Antigravity.

## 🌐 Use Online (No Installation Required)

**Live Web App:** **https://clipq.platyboar.workers.dev/**

**Personal OBS-Browser-Link:** Copy your unique OBS link inside **Settings → General** (hidden behind a reveal button by default and re-generatable anytime). It opens ClipQ inside OBS without requiring a separate Twitch login, optionally hides the top bar via **Show Topbar** (only in OBS), and receives live updates from Browser sessions via WebSocket whenever configuration or queue changes occur.

- Open the URL directly in your browser — no download, Python setup, or extra account required.
- Sign in using **Connect with Twitch** only.
- When using the online version, your settings, design, layout, clip memory, unique OBS token, and unlimited clip history are persisted in the EU (Cloudflare D1 + Durable Object WebSocket Hibernation) under your Twitch User ID, with JSON export and one-click server data deletion under **Settings → General**. *(Optional Worker secret `TWITCH_CLIENT_SECRET` enables Twitch clip metadata, durations, and channel chat badges inside OBS without user login.)*

> Prefer running everything on your own machine? You can also self-host ClipQ locally using the Windows executable or Python source instructions below.

## Features

- 🎬 **Multi-Platform Clips** — Twitch Clips (direct highest-resolution MP4 with iframe fallback & HEVC support), Twitch VOD, YouTube, TikTok, and Instagram Reels
- ⏯️ **Player Controls & Chat Sharing** — Fixed-width **Pause/Resume** toggle, **Previous/Next**, Autoplay timer pause/resume, persistent `<video>` volume/mute, and rapid **Share in Chat** button
- 💬 **Live Channel Chat & Formatting** — Toggleable live Twitch chat (`Activate Chat`) in `Settings → Design` with Twitch, 7TV, BetterTTV, and FrankerFaceZ emotes, custom font/size/color, centered channel badges, link filtering, auto-hide timer, slide animations, and a live test message button
- 🔧 **Chat Commands & Moderation** — Configurable `!clipq` commands (including `!clipq current`), blocked users/streamers/categories, max clip duration, time-windowed per-user clip limits (`Hours`/`Days`), and optional auto-removal on Twitch timeout/ban
- 📊 **Smart Queue & History** — Queue header with clip count and total playable duration (excluding VODs and over-limit entries), broken clip auto-skip, plus searchable History with platform filter chips
- 🔗 **Personal OBS-Browser-Link & Live Sync** — Reveal-protected unique per-user URL, **Show Topbar** OBS toggle, `1920x1080` canvas recommendation, and real-time diff-checked Browser → OBS WebSocket sync
- 🛡️ **Role-Based Permissions** — Configure which roles (Broadcaster, Lead Mod, Mod, VIP, All) can use each command
- 🌍 **Multi-Language** — English, German, Spanish, Russian, Portuguese, French, Japanese, and Italian included (Spanish, Russian, Portuguese, French, Japanese, and Italian were translated using AI; easily extendable)
- 🎨 **Customizable Design & Layout** — Compact 12-column color swatch grid, fonts, and layout (component ordering, sidebar position, info bar placement, and visibility toggles) saved per account
- 📋 **Clip Memory** — Prevents duplicate clips from being re-queued (with optional Mod/Lead Mod bypass)
- 💾 **Data Export, Import & Deletion** — Export or restore full JSON backups and delete stored online data anytime under **Settings → General**

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
| `!clipq current` | Post the current clip URL in chat | Broadcaster, Lead Mod, Mod |
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

### v2.1.0

- ⏯️ **Player Controls, Max Quality & Share in Chat** — Added a fixed-width **Pause/Resume** button (`⏸ Pause` / `▶ Resume`) between Previous and Next supporting direct `<video>` playback, YouTube (`enablejsapi=1`), TikTok, and autoplay timers; added Twitch GQL direct MP4 playback (including HEVC Error #4000 fallback) sorted explicitly for highest resolution and framerate, `yt-dlp` `format_sort` (`res`, `fps`, `br`), persistent HTML5 `<video>` volume/mute state, and rapid-click **Share in Chat** plus **`!clipq current`** (with OAuth `user:write:chat` scope enforcement).
- 📊 **Queue Duration, Time-Windowed Limits & Moderation** — Displayed total playable queue duration (`count • mm:ss`, excluding `twitch_vod` and clips over `maxDurationSeconds`) in the queue header; added max clip duration limits, rolling time windows (`Hours`/`Days`) for per-user clip limits, **Blocked Categories / Games**, configurable Twitch timeout clip-removal toggle, and automatic skipping of broken/unavailable clips.
- 💬 **Live Chat Emotes & Visual Refinement** — Added Twitch, 7TV, BetterTTV, and FrankerFaceZ emotes, configurable chat message auto-hide timers with slide transitions, a live **Send Test Message** button, stable height animations without chat bounce, vertically centered badges & usernames, compact 12-column Design color swatch alignment, History search & platform filter chips, and JSON backup import.

### v2.0.0

- 🌐 **Hosted Web App & EU Cloud Sync** — Live at **https://clipq.platyboar.workers.dev/** powered by Cloudflare Workers + Cloudflare D1 (EU), persisting settings, design, layout, clip memory, queue, and unlimited history per verified Twitch account, plus an optional Vercel `yt-dlp` proxy (`vercel-ytdlp/`) protected via shared secret and Twitch-authenticated proxy routes.
- 💾 **Data Export, Erasure & Tab-Close Flush** — Added JSON backup export and permanent server-data deletion under **Settings → General**, plus `pagehide`/`visibilitychange` `keepalive` flushing and paginated history loading.
- 💬 **`!clipq` Default & User Removal** — Switched the default command prefix from `!queue` to `!clipq` and extended `remove` to accept `<URL | all | user>` (e.g. `!clipq remove Platyboar`).
- 🎬 **Provider, Player & History Improvements** — Upgraded TikTok embeds to `/player/v1/` (autoplay end detection and unmuted playback), improved Instagram handle extraction and direct Reel/MP4 fallbacks, canonicalized Twitch `/clip/` & `/create/` URLs, skipped unavailable Twitch clips without archiving them, and added single-entry deletion (`✕`) in History.
- 👁️ **Layout `Hide` vs. `Remove` & Picker Polish** — Separate visibility toggles in **Layout**, accessible `:focus-visible` outlines, color picker fixes, and dark-contrast dropdown styling.
- 🔒 **Local Assets & Verification Suite** — Self-hosted all fonts (`.woff2`) and language flags locally, added the **About** tab (with privacy/storage details and GitHub Issues link), refactored modules under 500 lines, and added a 9-stage automated check suite (`check.bat`).

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
