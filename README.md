# ⚡ YT Smart Chapters Pro (v3.0)

> A powerhouse Chrome extension for students, competitive exam aspirants, and power viewers. Automate lecture transcript extraction, generate structured Question & Answer timestamps with AI, navigate seamlessly with keyboard shortcuts, sync chapter scroll with video playback, and auto-post comments to YouTube!

Made with 💖 by [pavnxet](https://github.com/pavnxet/yt-timestamp-skipper)

---

## 🌟 What's New in Version 3.0?

* **✨ Autonomous AI Lecture Analysis**: Built-in AI extractor tailored specifically for competitive exams and MCQ lecture videos. Instantly identifies question start times, teacher answers, and explanation timestamps.
* **🏷️ Interactive Category Filter Chips**: Filter your video timestamps instantly with 1-click filter chips:
  * **All**: View the complete breakdown of the video.
  * **Ques**: Jump strictly to where each question begins.
  * **Ans**: Skip directly to the correct option reveal.
  * **Explain**: Jump directly to in-depth question explanations.
* **⏳ 1-Hour Time-Based Intelligent Chunking**: Easily processes long 2-hour, 3-hour, and marathon lectures without truncating questions. Chunks transcripts by precise 1-hour segments (`3600s`) and merges them into a clean, numbered list.
* **🤖 Auto Timestamp Maker on Video Open**: Automatically checks Cloud DB or runs the AI generator whenever you open any YouTube video.
* **☁️ Cloud DB Auto-Sync & Prioritization**: Automatically queries Turso DB first; if previously saved chapters exist, it loads them in milliseconds without consuming AI quotas.
* **🔔 Completion Sound Alert**: Plays a crisp completion sound (`anime-wow.mp3` or custom user URL/audio upload) when AI generation finishes, with volume slider and audio preview.
* **🔄 Instant Video Navigation State Reset**: Switching videos instantly resets timeline markers, dashboard chapters, and editor cache to prevent stale timestamps from persisting.
* **💬 Auto Comment on YouTube**: One-click database saving automatically posts structured, clean chapter comments on YouTube with your signature watermark.
* **⏱️ Time-Synced Auto-Scrolling**: The chapters list automatically scrolls smoothly in real-time to keep the currently playing chapter in focus.
* **🎨 Adaptive Glassmorphism / Blur-Morphism**:
  * **Dark Theme**: Glossy frosted smoke-glass with neon cyan accents.
  * **Light Theme**: High-contrast, dense frosted glass that **never** blends into YouTube's white background.
  * **Dynamic Real-Time Sync**: Automatically adapts when you toggle YouTube between Dark and Light mode without page reloads.
* **🖱️ Double-Click Minimize / Maximize**: Double-click the header bar to quickly collapse into a sleek minimal bar and expand back.
* **☁️ Turso Database Cloud Sync**: Save and load timestamps across devices using your free Turso (libSQL) database.

---

## 🚀 Key Features

### 1. 🤖 AI-Powered Question & Timestamp Specialist
- Integrates with **AIKit (Claude Code API / Qwen3.8-max & Qwen3.7-plus)** and **OpenRouter AI**.
- Analyzes lecture transcripts and produces accurate Question Start, Correct Option, and Answer timestamps.
- Smart table parser converts Markdown responses directly into clickable timeline chapters and custom colored markers on the YouTube progress bar.

### 2. 🏷️ Smart Category Filtering (All / Ques / Ans / Explain)
- Toggle filter chips at the top of the Chapters tab to view only what you need:
  - **Ques Only**: Best for active quizzing and mock tests.
  - **Ans Only**: Quick revision of answers right before exams.
  - **Explain Only**: Skip the easy questions and focus on problem solutions.

### 3. 📜 Autonomous Transcript Extraction & Chunking
- Dedicated **📜 Fetch Transcript** button inside the Editor.
- If the Editor is empty and you click **✨ AI Generate Titles**, the extension will autonomously fetch the video's transcript with timestamps and feed it directly into the AI.
- Handles long 2-hour, 3-hour, and marathon lectures seamlessly with 1-hour time-based chunking.

### 4. ⏱️ Auto-Scroll Chapters with Video Playback
- As the video plays, the extension actively tracks the current chapter.
- The chapters list automatically scrolls to keep the active chapter visible without requiring manual scroll.

### 5. 💬 Auto-Comment with Watermark
- Enable **Auto Comment on YouTube** in Settings.
- When clicking **☁️ Save to DB** or using **Auto Save Sync**, it automatically posts a formatted comment directly under the YouTube video:
  ```text
  📌 Questions & Answers Timestamps:
  Q1: Question 02:33 | Answer 03:30 (A)
  Q2: Question 05:36 | Answer 07:02 (B)
  Q3: Question 07:53 | Answer 08:44 (D)

  ━━━━━━━━━━━━━━━━━━━━
  made with 💖 by pavnxet (https://github.com/pavnxet/yt-timestamp-skipper)
  ```

### 6. 🔔 Audio Notifications
- Optional completion audio chime when chapters finish generating.
- Select between the built-in default sound, custom audio URLs, or local file uploads with an adjustable volume slider and test trigger.

### 7. ⌨️ Keyboard Shortcuts & Modes
- **]**: Jump to Next Chapter.
- **[**: Jump to Previous Chapter.
- **Alt + X**: Add current timestamp with custom note marker.
- **Normal & Chapter Looping Modes**: Loop difficult question discussions continuously until you master the concept.

### 8. ☁️ Turso (libSQL) Database Sync
- Sync all timestamps to your personal cloud database.
- Easily reload previously saved chapters for any video ID with **🔄 Load DB**.

---

## 🛠️ Installation Guide

1. Clone or download this repository:
   ```bash
   git clone https://github.com/pavnxet/yt-timestamp-skipper.git
   ```
2. Open Google Chrome (or any Chromium browser like Brave, Edge).
3. Navigate to:
   ```text
   chrome://extensions/
   ```
4. Enable **Developer mode** in the top right corner.
5. Click **Load unpacked** and select the directory containing `manifest.json`.
6. Open any YouTube video and click the extension icon to launch the dashboard!

---

## ⚙️ Configuration

Open the **⚙️ Settings** tab inside the dashboard:

| Setting | Description | Default |
| :--- | :--- | :--- |
| **Auto Timestamp Maker** | Automatically generate chapters upon opening any YouTube video | Disabled |
| **Auto Save & Comment** | Automatically save to Turso DB and post YouTube comment on AI completion | Disabled |
| **AI Provider** | Select AIKit Qwen (Claude Code Protocol) or OpenRouter | AIKit Qwen |
| **Model** | Choose model (e.g., qwen3.8-max or qwen3.7-plus) | qwen3.8-max |
| **Turso Database** | (Optional) Enter your Turso DB URL (`libsql://...`) and Auth Token | Optional |
| **Sound Alert** | Toggle completion audio chime, volume slider, and custom sound | Enabled |
| **Auto Comment** | Toggle automatic comment posting on YouTube | Enabled |
| **Mini Floating Player** | Toggle secondary bottom mini widget | Disabled |

---

## 📁 Repository Structure

```text
yt-timestamp-skipper/
├── background.js       # Background Service Worker (1-hr chunking, AIKit / OpenRouter API handlers)
├── content.js          # Core injection engine, transcript extractor, chips filter & UI manager
├── content.css         # Glassmorphic Dark & Light theme blur-morphism styling
├── anime-wow.mp3       # Default completion sound effect
├── manifest.json       # Chrome Manifest V3 configuration
├── LICENSE             # MIT License with Attribution Requirement
└── README.md           # Documentation
```

---

## 📜 License & Attribution

This project is licensed under the **MIT License with Attribution Requirement**. You are free to use, study, and modify the code, provided that explicit credit and a link to the original author ([pavnxet](https://github.com/pavnxet)) and repository are retained. See the [LICENSE](LICENSE) file for complete details.

Created with 💖 by [pavnxet](https://github.com/pavnxet).
