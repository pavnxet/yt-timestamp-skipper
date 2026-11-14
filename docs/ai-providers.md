# Writing chapters with AI

There are two ways to turn a transcript into chapters. Pick one in **Settings → How chapters get written**.

## Manual mode (no API key)

This is the default, and it costs nothing.

1. Open the panel → **📝 Editor**.
2. Press **📜 Get transcript** (or paste your own).
3. Press **🧠 Copy skill**. The clipboard now holds the full chapter-writing rules, the video URL, and the transcript.
4. Paste it into ChatGPT, Gemini, Claude, or any free AI site.
5. Paste the reply back into the Editor.

The chapter list, markers and chapter card update as soon as you paste.

## API mode

Turn on **Use my own AI API**, then fill in one provider card.

### AIKit (recommended)

An OpenAI-compatible endpoint that speaks the Claude Code protocol.

| Field | Notes |
| --- | --- |
| Model | `qwen3.8-max` or `qwen3.7-plus` |
| Auth token | Your AIKit token |
| Endpoint URL | Pre-filled |

### OpenRouter

| Field | Notes |
| --- | --- |
| API key | `sk-or-v1-…` |
| Model | e.g. `google/gemma-4-31b-it:free` |

### Custom provider

Any OpenAI-compatible endpoint — a local llama.cpp server, LM Studio, vLLM, or a hosted API. Save several named profiles and switch between them.

## What the model is asked for

Three timestamps per question — **question start**, **correct option reveal**, and **explanation start** — as a Markdown table. The parser reads that table directly; if it returns prose instead, only lines with a leading timestamp are used.

> A chapter title may legitimately contain `|`. The parser only treats a line as a table row when it *starts* with a pipe.
