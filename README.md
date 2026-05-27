# ClipQ 🎬

**ClipQ** is a lightweight, self-hosted Clip Queue for Twitch streamers. Viewers submit clips via chat commands and the streamer watches them in order — with full control over the queue.

## Features

- 🎬 **Multi-Platform Clips** — Twitch, YouTube, TikTok, and Instagram clips
- 💬 **Chat Integration** — Viewers submit clips by pasting links in chat
- 🔧 **Chat Commands** — Moderators (and configurable roles) can control the queue via chat
- 🛡️ **Role-Based Permissions** — Configure which roles (Broadcaster, Lead Mod, Mod, VIP, All) can use each command
- 🌍 **Multi-Language** — English and German included, easily extendable
- 🎨 **Customizable Design** — Colors, fonts, and layout are fully customizable
- 📋 **Clip Memory** — Prevents duplicate clips from being re-queued
- 📜 **History** — Browse previously watched clips
- 🚫 **Moderation** — Blocked users/streamers, auto-removal on timeout/ban
- ▶️ **Autoplay** — Automatically advance to the next clip

## Getting Started

### Prerequisites

- [Python 3.8+](https://www.python.org/downloads/) (with `pip`)
- A [Twitch account](https://www.twitch.tv/)

### Installation

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
   Or simply double-click `start.bat` on Windows.

3. **Open in your browser:**
   ```
   http://localhost:8000
   ```

4. **Connect with Twitch** and start watching clips!

> `yt-dlp` is installed/updated automatically on startup for Instagram and TikTok video playback.

## Chat Commands

All commands use a configurable prefix (default: `!queue`).

| Command | Description | Default Roles |
|---------|-------------|---------------|
| `!queue next` | Play next clip | Broadcaster, Lead Mod, Mod |
| `!queue push [url]` | Push a clip to #1 in queue | Broadcaster, Lead Mod, Mod |
| `!queue open` | Open the queue for submissions | Broadcaster, Lead Mod, Mod |
| `!queue close` | Close the queue | Broadcaster, Lead Mod, Mod |
| `!queue clear` | Clear the entire queue | Broadcaster, Lead Mod, Mod |
| `!queue purgememory` | Clear the clip memory | Broadcaster, Lead Mod, Mod |
| `!queue autoplay on/off` | Toggle autoplay | Broadcaster, Lead Mod, Mod |
| `!queue limit [n]` | Set per-user clip limit | Broadcaster, Lead Mod, Mod |
| `!queue remove [url]` | Remove a specific clip | Broadcaster, Lead Mod, Mod* |
| `!queue remove all` | Remove all own clips | Everyone (own clips only) |
| `!queue providers [name] on/off` | Enable/disable a clip provider | Broadcaster, Lead Mod, Mod |

*\* Regular users can always remove their own submitted clips.*

## Adding a New Language

1. Create a new file in `app/public/js/lang/` (e.g., `es.js` for Spanish)
2. Copy the structure from `en.js` or `de.js`
3. Translate all strings
4. The language will automatically appear in the settings dropdown

## Tech Stack

- **Backend:** Python (`http.server` + `yt-dlp`)
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Chat:** [tmi.js](https://tmijs.com/) (Twitch IRC)
- **Auth:** Twitch OAuth Implicit Grant Flow

## License

This project is licensed under the [MIT License](LICENSE).
