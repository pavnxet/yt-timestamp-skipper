# Easy Video Timestamp Skipper - Smart + Auto Chapters v1.6+

A high-utility navigation enhancement designed for YouTube and Vimeo, transformed into a powerful **Study Companion**. Automate discovery of chapter markers, take time-stamped notes, and sync them with Turso DB.

## ✨ Key Features

- **💎 Glassy UI:** Sleek, modern interface that stays out of your way.
- **🖱️ Draggable & Persistent:** Move the widget anywhere; it remembers its position across sessions.
- **⏱️ Auto-Load Chapters:** Automatically detects and loads YouTube chapters from descriptions.
- **⌨️ Smart Hotkeys:**
  - `[` : Jump to previous chapter.
  - `]` : Jump to next chapter.
  - `u` : Capture current video timestamp and insert it into your notes.
- **🔁 Chapter Looping:** Toggle "Loop Chapter" to re-watch the current segment automatically—perfect for difficult lecture parts.
- **📝 Study Notes:** Edit timestamps and titles directly in the built-in textarea.
- **🌐 Turso DB Integration:**
  - Sync your notes to a Turso (LibSQL) database.
  - Share your notes via a unique URL snapshot.
  - Fallback to local storage per video ID if Turso is not configured.

## 🚀 Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Click on the Tampermonkey icon and "Create a new script".
3. Copy and paste the contents of `script.js` into the editor and save.
4. Open any YouTube or Vimeo video!

## 🛠️ Turso Setup (Optional for Sharing)

To use the cloud storage and sharing features:
1. Create a free database at [Turso.tech](https://turso.tech).
2. Get your **DB HTTP URL** and **Auth Token**.
3. Click the ⚙️ icon in the script UI and paste your credentials.
4. Your notes will now be shareable via the "Share Link" button!

## 📖 Usage Guide

- **Minimize/Maximize:** Click the title bar or the floating ⏱ button.
- **Capture Note:** Press `u` while watching to instantly mark a time and start typing a note.
- **Navigate:** Use `[` and `]` for quick jumping between segments.
- **Looping:** Click "Loop Chapter" to repeat the current section indefinitely.

## 📜 Technical Details

- **Namespace:** `http://tampermonkey.net/`
- **Matches:** `youtube.com/*`, `vimeo.com/*`
- **Storage:** `localStorage` for UI state and local notes, Turso for cloud snapshots.
- **Logic:** MutationObserver for dynamic page loading, interval-based status updates.

---

Made with 💖 by [pavnxet](https://github.com/pavnxet/yt-timestamp-skipper)

