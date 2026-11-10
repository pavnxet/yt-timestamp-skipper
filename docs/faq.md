# FAQ

## General

**What exactly does this extension do?**
It reads a YouTube lecture's transcript, asks an AI endpoint for question / answer / explanation timestamps, and turns them into clickable chapters with keyboard skipping. It can also find sponsor segments, upload them to SponsorBlock, save lists to your own database, and post the list as a comment.

**Is it free?**
The extension is free and MIT-licensed. AI calls cost whatever your provider charges — a long lecture is a large input, so a cheap model matters.

**Do I need an account?**
No account with the author. You need an AI endpoint, and optionally a Turso database and a SponsorBlock private ID.

**Does it collect data?**
No telemetry. Keys and lists stay in `chrome.storage.local` and in the Turso database you configure.

**Which videos does it work on?**
Any YouTube video with captions, including live (after they end), Shorts and embedded players on other sites.

## Setup

**Can I use a local model?**
Yes — **Custom** provider, base URL `http://localhost:11434/v1` (Ollama) or `http://localhost:1234/v1` (LM Studio), any non-empty key.

**Which model should I pick?**
A 128k-context instruction-following model. Enable **Disable chunking** for a single-pass result; keep chunking for small or local models.

**Why does AIKit come preconfigured?**
It is the author's default path (Claude Code protocol, Qwen models). Any OpenAI-compatible endpoint works identically.

**Do I have to use Turso?**
No. Lists persist locally. Turso only adds cross-device sync.

## Behaviour

**Why does it refuse an untimed transcript?**
Because every chapter would collapse to `00:00`. Untimed text is treated as a failure, not a result.

**Why did my chapters stop at 30 minutes?**
A chunk failed and the merge aborted. Check the progress messages and the service worker console.

**Why are some questions missing?**
The AI only sees the transcript. If a question was never spoken (it was only on screen), there is nothing to timestamp.

**Can I edit the timestamps?**
Yes, in the Editor. Edit the table, then **☁️ Save** to overwrite the stored list.

**Does it post comments without asking?**
Only on **Save** with the comment toggle on, or when **Auto Save & Comment** is enabled.

**Will it slow down YouTube?**
No polling of the player. The panel mounts once and reacts to navigation; heavy work is in the service worker.

## Troubleshooting

**"NO VIDEO" appears.**
Reload the tab. The ID resolver covers `/watch`, `/live/`, `/shorts/`, `/embed/`, `/v/` and the canonical link; a reload re-runs it.

**"NO TRANSCRIPT" appears.**
Captions are disabled or the panel did not open. Open *Show transcript* manually once, then retry. Embeds always use TranscriptAPI.

**SponsorBlock returns 403.**
You pasted the public user ID. Use the private 32-character UUID.

**SponsorBlock returns 409.**
Those segments already exist. Nothing to fix.

**The chime is silent.**
Check the tab is not muted and the volume slider is above 0; press **Test** in Settings.

**Chapters look wrong after a YouTube update.**
Update the extension — extraction has three fallbacks, but a large redesign can still need a new selector.

## Project

**Can I use this in my own product?**
Yes, under the MIT + attribution terms in [LICENSE](../LICENSE). Keep the credit and the link.

**Does it work on Firefox?**
Not yet. See [architecture.md](architecture.md) for the specific blockers.

**How do I contribute?**
Read [CONTRIBUTING.md](../CONTRIBUTING.md). Prompt changes must be mirrored into `docs/toolkit/`.
