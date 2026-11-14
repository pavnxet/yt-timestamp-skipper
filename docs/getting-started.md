# Getting started

## What this extension is

A Chrome extension that gives long YouTube lectures a real chapter list: question starts, correct-option reveals, explanation starts, and sponsor segments you can skip. It also draws a chapter card over the player as each chapter begins.

## The five-minute path

1. **Install** — see [installation.md](installation.md).
2. **Open any long video.** The ⚡ launcher appears bottom-right; click it to open the panel.
3. **Get the transcript** — **📝 Editor → 📜 Get transcript**. This pulls YouTube's captions with timestamps.
4. **Turn it into chapters**, one of two ways:
   - **Manual (default):** press **🧠 Copy skill**, paste into ChatGPT/Gemini/Claude, then paste the reply back into the Editor.
   - **API:** add your key in Settings, then press **⚡ Generate everything**.
5. **Play the video.** The Chapters tab fills in, the seek bar grows markers, and a glass card names each chapter as playback reaches it.

## What you get on screen

- **Chapter list** in the panel, filterable by Questions / Answers / Explain.
- **Markers** on the seek bar. Hover one to see its timestamp and name.
- **Chapter card** — a small glass popup that rises from the seek bar when playback crosses a chapter, then dismisses itself. Works in fullscreen.
- **Keyboard skipping** — jump to the next or previous chapter without touching the mouse.

## No API key? That is the default

Manual mode is on out of the box. Nothing in the extension needs a key except the optional in-app AI. See [ai-providers.md](ai-providers.md#manual-mode-no-api-key).
