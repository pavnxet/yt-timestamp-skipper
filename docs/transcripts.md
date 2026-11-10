# Transcripts

Chapters are only as good as the transcript under them. This page explains where the text comes from, in what order the extension tries, and how it fails.

## The three sources, in order

| Order | Source | Used when |
| :-: | :--- | :--- |
| 1 | **YouTube's transcript panel** — modern tabbed *"In this video"* view (`transcript-segment-view-model`) | Normal watch pages with captions |
| 2 | **YouTube's legacy transcript renderer** | Older layout, A/B variants |
| 3 | **TranscriptAPI** (`transcriptapi.com/api/v2/youtube/transcript`) | Panel missing, captions restricted, or the video is embedded |

A node-walk fallback runs after the two panel selectors so a layout change does not break extraction outright. YouTube's hidden dummy panel is ignored, so you never get an empty transcript from the wrong node.

## The timestamp rule

Every emitted line must carry a timecode. If a source returns text without one, the run is treated as a **failure**, not as a result — the extension will not generate chapters from untimed text, because every chapter would collapse to `00:00`.

## Why a transcript may be missing

| Cause | What you see | Fix |
| :--- | :--- | :--- |
| Captions disabled by the uploader | Panel shows nothing, API returns no segments | Ask the uploader, or use a different source video |
| Live stream still running | No transcript until the stream ends | Generate after the stream finishes |
| Video is age- or region-restricted | Panel fails, API returns 403 | Sign in, change region, or use a mirror |
| Video is a Short | Very short transcript | Works, but chapters are rarely useful |
| Embedded player | No panel at all by design | TranscriptAPI path is used automatically |
| Auto-generated captions only | Works, but ASR errors reach the AI | Expect slightly noisier chapter boundaries |

## Auto-copy

With **Copy transcript to clipboard** on, every video you open has its timestamped transcript placed on the clipboard, with a notification. This is for pasting into your own notes or another AI. It will not copy an untimed transcript.

## Format on the clipboard

```text
00:00 intro to the chapter
02:33 question one, four options
03:30 option (A) is correct
03:31 explanation of option A
```

One line per segment, `MM:SS` or `HH:MM:SS`, then the text. That is also the format the Editor accepts when you paste your own transcript.

## Using your own transcript

**Step 1:** Paste it into the Editor.

**Step 2:** Check that each line starts with a timecode — the parser keys on the leading timestamp.

**Step 3:** Press **Generate**. The same prompt runs, and the same table comes back.

If your source has no timestamps at all, chapters cannot be placed; get a timed transcript first.
