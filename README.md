# Easy Video Timestamp Skipper - Extension v1.7+

A high-utility navigation enhancement designed for YouTube and Vimeo, transformed into a powerful **Study Companion** browser extension. Automate discovery of chapter markers, take time-stamped notes, and sync them with Turso DB.

## ✨ Key Features

- **💎 Extension Popup:** Sleek, modern interface accessible from your browser toolbar.
- **⏱️ Auto-Load Chapters:** Automatically detects and loads YouTube chapters from descriptions.
- **⌨️ Smart Hotkeys:**
  - `[` : Jump to previous chapter.
  - `]` : Jump to next chapter.
  - `u` : Capture current video timestamp and insert it into your notes.
- **🔁 Chapter Looping:** Toggle "Loop Chapter" to re-watch the current segment automatically.
- **📝 Study Notes:** Edit timestamps and titles directly in the built-in textarea.
- **🌐 Turso DB Integration:**
  - Sync your notes to a Turso (LibSQL) database.
  - Share your notes via a unique URL snapshot.
  - Fallback to chrome.storage.local per video ID if Turso is not configured.

## 🚀 Installation

1. Clone or download this repository.
2. Open your browser's extension management page (`chrome://extensions` for Chrome).
3. Enable "Developer mode" (usually a toggle in the top right).
4. Click "Load unpacked" and select the folder containing the extension files.
5. Open any YouTube or Vimeo video and click the extension icon!

## 🛠️ Turso Setup (Optional for Sharing)

To use the cloud storage and sharing features:
1. Create a free database at [Turso.tech](https://turso.tech).
2. Get your **DB HTTP URL** and **Auth Token**.
3. Click "Settings" in the extension popup and paste your credentials.
4. Your notes will now be shareable via the "Share Link" button!

## 📖 Usage Guide

- **Capture Note:** Press `u` while watching to instantly mark a time in the popup's textarea.
- **Navigate:** Use `[` and `]` for quick jumping between segments.
- **Looping:** Click "Loop Chapter" to repeat the current section indefinitely.

## 📜 Technical Details

- **Manifest Version:** 3
- **Permissions:** `storage`, `activeTab`, `tabs`
- **Matches:** `youtube.com/*`, `vimeo.com/*`
- **Storage:** `chrome.storage.local` for UI state and local notes, Turso for cloud snapshots.
