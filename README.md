# ⚡ YT Smart Chapters Pro (v3.5.2)

> A powerhouse Chrome extension for students, competitive exam aspirants, and power viewers. Automate lecture transcript extraction, generate structured Question & Answer timestamps with AI, navigate seamlessly with keyboard shortcuts, sync chapter scroll with video playback, and auto-post comments to YouTube!

Made with 💖 by [pavnxet](https://github.com/pavnxet/yt-timestamp-skipper)

---

## 🌟 What's New in Version 3.5?

* **🖼️ Works on Embedded Players**: The extension now runs inside YouTube embeds on **any website** — course platforms, blogs, your own dashboards. A ⚡ launcher appears on the host page; click it and the panel opens over the player. Supports `youtube.com/embed`, `youtube-nocookie.com` and the legacy `/v/` player.
* **🏷️ Multi-Select Section Filter**: The filter chips are now toggles, so you can run **Questions + Answers** together and leave **Explain** out entirely — skipping follows whatever you have selected.
* **📥 One-Click Paste (Ads & Sponsors)**: The old *Quick paste* drawer is gone. One **📥 Paste segments** button reads your clipboard, parses the table or `[MM:SS]-[MM:SS]` intervals, and renders the cards in a single click.
* **☁️ Save Straight from the Editor**: The Editor tab now has its own **☁️ Save** button next to **📋 Copy** and **📥 Paste**, so you never have to switch back to the Chapters tab.
* **📋 Auto-Copy Transcript**: A new Settings toggle grabs the transcript of every video you open, writes it to your clipboard and notifies you. Never overwrite it with a timestamp-less transcript — untimed text is rejected.
* **🧩 Modern Transcript Panel Support**: Reads the tabbed *"In this video"* transcript view (`transcript-segment-view-model`), the legacy renderer, and a node-walk fallback — while ignoring YouTube's hidden dummy panel.
* **📺 Live, Shorts & Embed URLs**: Video IDs are resolved from `/live/`, `/shorts/`, `/embed/`, `/v/` and the canonical link, so "NO VIDEO" no longer appears on a live stream.
* **💬 Comment Uses the Option Timestamp**: Auto-comments now show where the **correct option is revealed** instead of where the explanation starts (falling back only when the option time is `N/A`).

### Earlier releases

* **3.4.x** — Never emit or copy transcript lines without timestamps; filter chips drive skip navigation.
* **3.2 – 3.3** — Paste button, one-click segments, auto-copy toggle.
* **3.1.0** — Warm Claude theme UI redesign, full 128k context (no chunking for GLM 5.3), 30-minute intelligent time chunking, multi-segment SponsorBlock auto-detection, completion sound alert, Turso cloud sync.

---

## 🚀 Key Features

### 1. 🤖 AI-Powered Question & Timestamp Specialist
- Integrates with **Custom OpenAI-compatible Endpoints**, **AIKit (Claude Code Protocol / Qwen models)**, and **OpenRouter AI**.
- Analyses lecture transcripts and produces accurate Question Start, Correct Option and Answer timestamps.
- Smart table parser converts Markdown responses directly into clickable timeline chapters and coloured markers on the YouTube progress bar.

### 2. 🏷️ Multi-Select Section Filtering
- Chips at the top of the Chapters tab **toggle independently** — combine any of **Questions**, **Answers** and **Explain**.
- The selection drives the chapter list, the timeline markers **and** the next/previous skip targets. Pick Questions + Answers to revise an MCQ paper without ever landing on an explanation.
- **All** resets the selection; switching the last section off falls back to All.

### 3. 🖼️ Embedded YouTube Players
- Runs inside embeds on any site, including privacy-enhanced `youtube-nocookie.com` players.
- The panel is opened from a ⚡ launcher on the host page, then behaves exactly as it does on YouTube.
- Embeds have no transcript panel, so transcripts there come from the TranscriptAPI path.

### 4. 📜 Autonomous Transcript Extraction & Chunking
- **📜 Get transcript** button in the Editor, plus automatic fetching whenever the Editor is empty and you generate chapters.
- Reads YouTube's own transcript panel (modern tabbed and legacy layouts) and falls back to TranscriptAPI for restricted videos.
- Lines are never emitted without their timecode — an untimed transcript is treated as a failure, not a result.
- Handles marathon lectures with 30-minute time-based chunking, or a full-length pass for 128k models.

### 5. 🚫 SponsorBlock Detection & Upload
- Detects sponsor reads, self-promotion, intros, outros, previews and filler, then can upload every interval to SponsorBlock.
- **📥 Paste segments** imports a table you already have in one click; **➕ Add manually** (hotkey **Alt + S**) marks a single interval.
- Built-in safety gauge warns before removable segments pass 80% of the video.

### 6. ⏱️ Auto-Scroll Chapters with Video Playback
- Tracks the current chapter as the video plays and keeps it in view without manual scrolling.

### 7. 💬 Auto-Comment with Watermark
- Enable **Post timestamps as a comment** in Settings.
- On **☁️ Save** or **Auto Save Sync**, it posts a formatted comment under the video:

  ```
  📌 Questions & Answers Timestamps:
  Q1: Question 02:33 | Answer 03:30 (A)
  Q2: Question 05:36 | Answer 07:02 (B)
  Q3: Question 07:53 | Answer 08:44 (D)

  ━━━━━━━━━━━━━━━━━━━━
  made with 💖 by pavnxet
  https://github.com/pavnxet/yt-timestamp-skipper
  ```

- The `Answer` time is where the **correct option is revealed**.

### 8. 🔔 Audio Notifications
- Optional completion chime — built-in sound, a custom URL, or a local file upload, with a volume slider and test trigger.

### 9. ⌨️ Keyboard Shortcuts & Modes
- **]**: Jump to Next Chapter.
- **[**: Jump to Previous Chapter.
- **Alt + X**: Add the current timestamp with a custom note marker.
- **Alt + S**: Mark a sponsor segment start/end.
- **Normal & Chapter Looping Modes**: Loop a difficult discussion until you master it.

### 10. ☁️ Turso (libSQL) Database Sync
- Save every timestamp list to your own cloud database and reload it on any device without spending AI credits again.

---

## 🛠️ Installation Guide

1. Clone or download this repository:

   ```bash
   git clone https://github.com/pavnxet/yt-timestamp-skipper.git
   ```

2. Open Google Chrome (or any Chromium browser like Brave, Edge).
3. Navigate to:

   ```
   chrome://extensions/
   ```

4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** and select the directory containing `manifest.json`.
6. Open any YouTube video and click the extension icon (or the ⚡ button) to launch the dashboard.

> **Updating from an older version?** Click **Reload** on the extension card. Versions from 3.2 onward add the `clipboardRead` and `youtube-nocookie.com` permissions, so Chrome will ask you to re-approve once.

---

## ⚙️ Configuration

Open the **⚙️ Settings** tab inside the dashboard:

| Setting | Description | Default |
| :--- | :--- | :--- |
| **Generate chapters when a video opens** | Automatically fetch the transcript and write chapters on every video | Disabled |
| **Copy transcript to clipboard when a video opens** | Grabs the transcript, copies it, and notifies you | Disabled |
| **Auto Save & Comment** | Save to Turso DB and post the YouTube comment when chapters are ready | Disabled |
| **Auto upload ads to SponsorBlock** | Scan and upload removable segments after the chapters | Disabled |
| **Post timestamps as a comment** | Post the Q&A timestamps under the video when you save | Enabled |
| **AI Provider** | AIKit Qwen, OpenRouter, or any OpenAI-compatible endpoint | AIKit Qwen |
| **Model** | Choose your model (e.g. Qwen 3.8, GLM 5.3, Gemma, DeepSeek) | Model of choice |
| **Turso Database** | (Optional) Turso DB URL (`libsql://…`) and auth token | Optional |
| **TranscriptAPI key** | (Optional) Used when YouTube's own transcript is unavailable, and always for embeds | Built-in key |
| **SponsorBlock private ID** | Required only to upload segments to SponsorBlock | Optional |
| **Sound Alert** | Completion chime, volume slider, custom sound | Enabled |
| **Mini Floating Player** | Secondary bottom mini widget with previous / next | Disabled |

---

## 📁 Repository Structure

```text
yt-timestamp-skipper/
├── background.js        # Service worker: AI providers, transcript API, SponsorBlock, Turso
├── content.js           # Core engine: transcript extraction, chapters, filters, dashboard UI
├── content.css          # Warm Claude theme, glassmorphism tokens, responsive layouts
├── embed-launcher.js    # Host-page ⚡ launcher for embedded YouTube players
├── anime-wow.mp3        # Default completion sound effect
├── manifest.json        # Chrome Manifest V3 configuration (v3.5.2)
├── icons/               # Multi-resolution extension icon suite (16px to 128px)
├── docs/                # GitHub Pages landing page + AI toolkit prompts
├── LICENSE              # MIT License with Attribution Requirement
└── README.md            # Documentation
```

---

## 🧭 How It Works

1. **Transcript** — the content script opens YouTube's transcript panel and reads the segments (modern or legacy layout). If that is unavailable — or the video is embedded — it falls back to TranscriptAPI.
2. **Chapters** — the transcript goes to your chosen AI provider, which returns a Markdown table of question, option and explanation timestamps. Long videos are chunked and merged.
3. **Navigation** — the table is parsed into chapters, drawn as markers on the progress bar, and used as the skip targets for the keyboard shortcuts and the mini player.
4. **Saving** — chapters go to your Turso database and, optionally, into a comment on the video.

---

## 📜 License & Attribution

This project is licensed under the **MIT License with Attribution Requirement**. You are free to use, study, and modify the code, provided that explicit credit and a link to the original author ([pavnxet](https://github.com/pavnxet)) and repository are retained. See the [LICENSE](LICENSE) file for complete details.

Created with 💖 by [pavnxet](https://github.com/pavnxet).
