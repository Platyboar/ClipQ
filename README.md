# ClipQ 🎬

**ClipQ** is a lightweight, self-hosted Clip Queue for Twitch streamers. Viewers submit clips via chat commands and the streamer watches them in order — with full control over the queue.
Developed with the help of Google Antigravity.

## Features

- 🎬 **Multi-Platform Clips** — Twitch, YouTube, TikTok, and Instagram clips
- 💬 **Chat Integration** — Viewers submit clips by pasting links in chat
- 🔧 **Chat Commands** — Moderators (and configurable roles) can control the queue via chat
- 🛡️ **Role-Based Permissions** — Configure which roles (Broadcaster, Lead Mod, Mod, VIP, All) can use each command
- 🌍 **Multi-Language** — English, German, Spanish, Russian, Portuguese, French, Japanese, and Italian included (Spanish, Russian, Portuguese, French, Japanese, and Italian were translated using AI; easily extendable)
- 🎨 **Customizable Design & Layout** — Colors, fonts, and layout (component ordering, sidebar position, info bar placement, and component visibility) are fully customizable and can be saved as defaults
- 📋 **Clip Memory** — Prevents duplicate clips from being re-queued
- 📜 **History** — Browse previously watched clips
- 🚫 **Moderation** — Blocked users/streamers, auto-removal on timeout/ban
- ◀️ **Autoplay** — Automatically advance to the next clip

## Getting Started

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
  > **Note for Windows source users:** Running the app via `start.bat` will automatically verify your Python installation. If Python is missing or older than 3.8, it will silently download and install Python 3.12 for you.
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
   Or simply double-click `start.bat` on Windows.

3. **Open in your browser:**
   Open `http://localhost:8000` in your web browser.

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
