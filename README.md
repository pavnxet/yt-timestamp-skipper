# ⚡ YT Smart Chapters Pro (v3.0)

> A powerhouse Chrome extension for students, competitive exam aspirants, and power viewers. Automate lecture transcript extraction, generate structured Question & Answer timestamps with AI, navigate seamlessly with keyboard shortcuts, and auto-post comments to YouTube!

Made with 💖 by [pavnxet](https://github.com/pavnxet/yt-timestamp-skipper)

---

## 🌟 What's New in Version 3.0?

* **✨ Autonomous AI Lecture Analysis**: Built-in AI extractor specifically tailored for MCQ lecture videos. Instantly identifies question start times, teacher answers, and explanations.
* **📜 1-Click Auto Transcript Fetching**: No more copy-pasting user scripts! The extension autonomously triggers and extracts the full YouTube transcript with timestamps.
* **💬 Auto Comment on YouTube**: One-click database saving automatically posts structured, clean chapter comments on YouTube with your signature watermark.
* **🎨 Adaptive Glassmorphism / Blur-Morphism**:
  * **Dark Theme**: Glossy frosted smoke-glass with neon cyan accents.
  * **Light Theme**: High-contrast, dense frosted glass that **never** blends into YouTube's white background.
  * **Dynamic Real-Time Sync**: Automatically adapts when you toggle YouTube between Dark and Light mode without needing page reloads.
* **📌 Clean Tabbed Dashboard**: Draggable, bounded floating window with dedicated tabs for Chapters, Editor, and Settings.
* **☁️ Turso Database Cloud Sync**: Save and load timestamps across devices using your free Turso (libSQL) database.

---

## 🚀 Key Features

### 1. 🤖 AI-Powered Question & Timestamp Specialist
- Integrates with **AIKit (Claude Code API / Qwen3.8-max & Qwen3.7-plus)** and **OpenRouter AI**.
- Analyzes lecture transcripts and produces accurate Question Start, Correct Option, and Answer timestamps.
- Smart table parser converts Markdown responses directly into clickable timeline chapters and markers on the YouTube player.

### 2. 📜 Autonomous Transcript Extraction
- Dedicated **📜 Fetch Transcript** button inside the Editor.
- If the Editor is empty and you click **✨ AI Generate Titles**, the extension will autonomously fetch the video's transcript with timestamps and feed it directly into the AI.
- Compatible with single video and playlist views.

### 3. 💬 Auto-Comment with Watermark
- Enable **" Post timestamps as comment\** in Settings.
- When clicking **☁️ Save to DB**, it automatically posts a concise, formatted comment directly under the YouTube video:
 ` ext
 📌 Questions & Answers Timestamps:
 Q1: Question 02:33 | Answer 03:30 (A)
 Q2: Question 05:36 | Answer 07:02 (B)
 Q3: Question 07:53 | Answer 08:44 (D)

 ━━━━━━━━━━━━━━━━━━━━
 made with 💖 by pavnxet(https://github.com/pavnxet/yt-timestamp-skipper)
 `

### 4. ⌨️ Keyboard Shortcuts & Modes
- **]**: Jump to Next Chapter.
- **[**: Jump to Previous Chapter.
- **Alt + X**: Add current timestamp with custom note marker.
- **Normal & Chapter Looping Modes**: Loop difficult question discussions continuously until you master the concept.

### 5. ☁️ Turso (libSQL) Database Sync
- Sync all timestamps to your personal cloud database.
- Easily reload previously saved chapters for any video ID with **🔄 Load DB**.

---

## 🛠️ Installation Guide

1. Clone or download this repository:
 `ash
 git clone https://github.com/pavnxet/yt-timestamp-skipper.git
 `
2. Open Google Chrome (or any Chromium browser like Brave, Edge).
3. Navigate to:
 ` ext
 chrome://extensions/
 `
4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** and select the root directory containing manifest.json.
6. Open any YouTube video and click the extension icon to launch the dashboard!

---

## ⚙️ Configuration

Open the **⚙️ Settings** tab inside the dashboard:

| Setting | Description | Default |
| :--- | :--- | :--- |
| **AI Provider** | Select AIKit Qwen (Claude Code Protocol) or OpenRouter | AIKit Qwen |
| **Model** | Choose model (e.g., qwen3.8-max or qwen3.7-plus) | qwen3.8-max |
| **Turso Database** | (Optional) Enter your Turso DB URL (libsql://...) and Auth Token | Optional |
| **Auto Comment** | Toggle automatic comment posting on YouTube | Enabled |
| **Mini Floating Player** | Toggle secondary bottom mini widget | Disabled |

---

## 📁 Repository Structure

` ext
yt-timestamp-skipper/
├── background.js # Background Service Worker (AIKit / OpenRouter API handlers)
├── content.js # Core injection engine, transcript extractor & UI manager
├── content.css # Glassmorphic Dark & Light theme blur-morphism styling
├── manifest.json # Chrome Manifest V3 configuration
├── README.md # Documentation
└── old version/ # Previous tampermonkey and v2.0 archive
`

---

## 💖 Contributing & License

Contributions, feature suggestions, and bug reports are welcome! Feel free to open an issue or submit a pull request.

Created with 💖 by [pavnxet](https://github.com/pavnxet).
