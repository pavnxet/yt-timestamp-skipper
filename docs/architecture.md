# Architecture

A single content script, no framework, no build step.

## Runtime shape

```
YouTube page
├── content.js        panel, parsing, skipping, overlays
│   ├── dashboard     4 tabs: Chapters, Editor, Ads & Sponsors, Settings
│   ├── chapter card  glass popup on chapter crossings
│   ├── marker probe  hover tooltip on seek-bar markers
│   └── storage      chrome.storage.local
├── content.css       themes, panel, overlays
└── background.js     service worker
    ├── transcript fetch (YouTube captions → TranscriptAPI fallback)
    ├── AI provider calls
    └── SponsorBlock upload
```

## The chapter pipeline

1. **Source** — `allParsedChapters` holds `{t, title, category}`.
2. **Parse** — `updateStateFromText` reads the Editor line by line. A line is a table row only if it *starts* with `|`; otherwise it needs a leading timestamp.
3. **Filter** — `applyChapterFilter` rebuilds `timestamps` / `titles` from the active chips.
4. **Render** — markers on `.ytp-progress-list`, rows in the Chapters tab.
5. **Watch** — `findCrossing(last, now, chapters)` compares two playback samples; a jump over 1.5 s is a seek and is ignored.
6. **Overlay** — `anchorFor()` places the card over its marker, clamped to the viewport, with the tail still pointing at the real marker.

## Overlay rules

- Host is `document.fullscreenElement || document.body` — never `.html5-video-player`, which clips.
- Coordinates are always viewport-space (`getBoundingClientRect` + `window.innerWidth/innerHeight`).
- `pointer-events: none` on every overlay, so nothing can swallow a click on the video.

## Storage keys

`chrome.storage.local`, namespaced by concern: `aiProvider`, `aiToken`, `openrouterKey`, `transcriptApiKey`, `generationMode`, `showChapterCard`, `autoGenerate`, `autoCopyTranscript`, `uiTheme`, `tursoUrl`, `tursoToken`, `sb_segments_<videoId>`.

Renaming one silently drops user data — treat them as public API.
