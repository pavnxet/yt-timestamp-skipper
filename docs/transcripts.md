# Transcripts

The extension needs a timestamped transcript before it can write chapters.

## Where transcripts come from

1. **YouTube's own captions** — tried first, through **📜 Get transcript**.
2. **TranscriptAPI fallback** — used when captions are missing, and always for embedded players.
3. **Your clipboard** — paste anything timestamped into the Editor.

## You need your own TranscriptAPI key

There is **no built-in key**. Add yours in **Settings → TranscriptAPI key**.

Without it:

- Videos with working YouTube captions still work.
- Videos without captions, and embedded players, fail with *"No transcript API key configured."*

## Formats accepted

```
01:23 Introduction
1:02:45 Q7: Question Start (Ans: B)
```

`MM:SS` or `HH:MM:SS`, followed by anything. Lines without a timestamp are ignored, and a title may contain `|` — it will not be mistaken for a table row.

## What to do when a transcript will not load

- **No captions on the video** — this is the common case for regional-language lectures. Use the TranscriptAPI path with your key.
- **Live streams** — no transcript until the stream ends.
- **Embeds** — always go through TranscriptAPI.
- **Everything fails** — paste your own transcript into the Editor. Chapter writing still works.

See [troubleshooting.md](troubleshooting.md) if the panel reports an error.
