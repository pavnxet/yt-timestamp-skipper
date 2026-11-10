# Getting started

From zero to a clickable chapter list in about five minutes.

## Before you begin

| You need | Why |
| :--- | :--- |
| Chrome, Edge, Brave, Opera or Vivaldi (current stable) | The extension is Manifest V3 |
| A YouTube lecture with captions available | Chapters are built from the transcript |
| An AI endpoint — AIKit, OpenRouter or your own | Chapter generation is an AI call |
| Optional: a SponsorBlock private ID | Only if you want to upload sponsor segments |
| Optional: a Turso database | Only if you want cloud sync |

## Step 1 — Install the extension

Follow [installation.md](installation.md). Short version: `chrome://extensions/` → **Developer mode** → **Load unpacked** → pick the repo folder.

## Step 2 — Open the panel

Open any YouTube video and click the **⚡** button on the page, or the extension icon in the toolbar. The panel docks on the right side of the player.

If nothing appears, reload the tab once — content scripts only attach on page load.

## Step 3 — Choose a provider

Open **⚙️ Settings → AI Provider**:

- **AIKit** (default) — paste your AIKit token.
- **OpenRouter** — paste your OpenRouter key and the model slug, e.g. `qwen/qwen-2.5-72b-instruct`.
- **Custom** — base URL, key, model. Save it as a named profile if you use more than one.

Hit **Verify** to confirm the endpoint answers before you spend a real call on a long lecture.

## Step 4 — Generate chapters

In the **Editor** tab:

1. **📜 Get transcript** — fills the editor with timestamped lines.
2. **Generate** — sends the transcript to your provider and parses the returned table.
3. Watch the progress bar: long lectures are split into 30-minute chunks and merged.

## Step 5 — Use the chapters

- Cards appear in the **Chapters** tab; markers appear on the YouTube progress bar.
- `]` jumps to the next chapter, `[` goes back.
- Section chips (**Questions**, **Answers**, **Explain**) change what the list and the hotkeys target.
- **☁️ Save** writes the list to Turso; **💬 Comment** posts it under the video.

## What to do next

- Learn the filter behaviour in [chapters-and-filters.md](chapters-and-filters.md).
- Set up cloud sync in [turso-sync.md](turso-sync.md).
- Turn on auto-generation in [configuration.md](configuration.md) so every lecture in a playlist is ready before you start watching.
