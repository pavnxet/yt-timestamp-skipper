# FAQ

**Does it work without an API key?**
Yes — that is the default. **Manual mode** copies the chapter-writing skill to your clipboard so you can use any free AI site. Only the optional in-app AI needs a key.

**Is there a built-in transcript key?**
No. Add your own TranscriptAPI key in Settings. Videos with working YouTube captions need no key at all.

**Does the chapter card work in fullscreen?**
Yes. It is appended to the fullscreen element, not the page body.

**Will it post comments without asking?**
Only when **Auto save & comment** is on, or when you press Save with commenting enabled.

**Does it work on Shorts, live streams and embedded players?**
Video IDs are resolved from `/watch`, `/live/`, `/shorts/`, `/embed/` and `/v/`. Live streams have no transcript until they end, so they need the TranscriptAPI path. Embeds always use TranscriptAPI.

**Where is my data stored?**
`chrome.storage.local` on your machine. Chapters sync only if you configure Turso. Nothing goes to a server of ours — there isn't one.

**Why did my chapter list come out empty?**
Almost always the Editor format: each line must start with `MM:SS` or `HH:MM:SS`. See [troubleshooting.md](troubleshooting.md).

**How do updates work?**
Install the CRX from a release once and Chrome polls that release's `updates.xml` every few hours. See [auto-update.md](auto-update.md).

**Can I use it on Edge or Brave?**
Yes — anything Chromium with Manifest V3.
