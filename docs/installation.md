# Installation

## Requirements

| Item | Minimum | Notes |
| :--- | :--- | :--- |
| Browser | Chrome, current stable (Manifest V3) | Edge, Brave, Opera and Vivaldi work; Firefox does not |
| OS | Windows, macOS, Linux, ChromeOS | No native code, no build step |
| Disk | ~1 MB | The repo is plain JS, CSS and one MP3 |
| Network | HTTPS to your AI endpoint | Plus YouTube, TranscriptAPI, SponsorBlock, Turso |

## Install from source (recommended)

**Step 1:** Clone or download.

```bash
git clone https://github.com/pavnxet/yt-timestamp-skipper.git
```

No `npm install`, no bundler. The files in the repo *are* the extension.

**Step 2:** Open `chrome://extensions/`.

**Step 3:** Enable **Developer mode** (top-right toggle).

**Step 4:** Click **Load unpacked** and select the folder containing `manifest.json`.

**Step 5:** Pin the extension from the puzzle-piece menu, then open a YouTube video.

## Updating

**Step 1:** Pull the new code.

```bash
cd yt-timestamp-skipper && git pull
```

**Step 2:** Click **Reload** (the circular arrow) on the extension card.

**Step 3:** Reload any open YouTube tabs.

From version 3.2 onward the manifest adds `clipboardRead` and `youtube-nocookie.com`, so the browser asks you to re-approve permissions once.

## Permissions, and why each exists

| Permission | Used for |
| :--- | :--- |
| `storage` | Saving settings, keys and cached lists in `chrome.storage.local` |
| `clipboardWrite` | Copying chapters and the auto-copied transcript |
| `clipboardRead` | The **📥 Paste segments** button |
| `*://*.youtube.com/*`, `*://*.youtube-nocookie.com/*` | Reading the player, transcript panel and posting comments |
| `*://*/*` (content script only) | The ⚡ launcher that appears next to embedded players on other sites |
| `transcriptapi.com` | Fallback transcript fetch |
| `sponsor.ajay.app` | SponsorBlock lookups and uploads |
| `openrouter.ai`, `claude.aikit.club` | AI providers |
| `*.turso.io` | Your libSQL database |
| `localhost`, `127.0.0.1` | Local OpenAI-compatible servers (Ollama, LM Studio, llama.cpp) |

Nothing is sent anywhere you did not configure. There is no telemetry endpoint.

## Uninstall cleanly

Removing the extension from `chrome://extensions/` deletes its `chrome.storage.local` data with it. Export or comment your chapter lists first if you want to keep them.

## Troubleshooting the install itself

| Symptom | Fix |
| :--- | :--- |
| "Manifest file is missing or unreadable" | You selected the parent folder. Select the one that directly contains `manifest.json`. |
| Extension loads but no ⚡ button | Reload the YouTube tab; content scripts attach at `document_idle`. |
| "This extension may have been corrupted" | Re-clone the repo; a partial ZIP download breaks file integrity. |
| Buttons do nothing after an update | Click **Reload** on the extension card, then hard-reload the tab. |
