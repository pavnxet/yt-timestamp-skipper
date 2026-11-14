# Troubleshooting

## Chapters tab is empty but the Editor has text

The parser ran and rejected every line. Check the Editor's format:

```
01:23 Introduction
```

`MM:SS` or `HH:MM:SS` must come **first** on the line. Lines without a leading timestamp are ignored by design.

## "No transcript API key configured"

There is no built-in key. Add yours in **Settings → TranscriptAPI key**, or paste a transcript into the Editor manually.

## No chapter card during playback

- Is **Settings → Show chapter card during playback** on?
- Are there chapters? The card only fires when playback *crosses* a timestamp, not when it merely starts mid-chapter.
- Did you seek? Scrubbing is deliberately silent.
- Manual mode is the default — the card still works, it just needs chapters first.

## Hovering a marker shows nothing

The tooltip needs the progress bar to exist when the probe binds. Move the pointer along the bar once; the probe re-attaches on the next playback tick. If it still fails, the player layout may have changed — check `.ytp-progress-bar`.

## Panel or card disappears in fullscreen

Fixed in 3.7.1. Overlay UI is appended to `document.fullscreenElement || document.body`; parenting it to `.html5-video-player` clips it. Update the extension.

## Generation buttons are missing

You are in **Manual mode** (the default). Either press **🧠 Copy skill** in the Editor, or turn on **Use my own AI API** in Settings.

## Chapters parse but the video does not skip

Check that the section filter is not hiding the chapters you expect, and that the keyboard shortcut is not taken by another extension.

## Nothing loads at all

Open `chrome://extensions`, confirm the extension is enabled, then reload it and refresh the YouTube tab.
