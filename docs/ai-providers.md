# AI providers

The extension is provider-agnostic: it talks to any endpoint that accepts an OpenAI-style `POST /chat/completions` with a `messages` array. Three are wired in.

## At a glance

| Provider | Base URL | Auth | Best for |
| :--- | :--- | :--- | :--- |
| **AIKit** | `https://claude.aikit.club/qwen.aikit.club/v1` | AIKit token | Default; Claude Code protocol, Qwen models, generous context |
| **OpenRouter** | `https://openrouter.ai/api/v1` | OpenRouter key | Trying many models behind one key |
| **Custom** | Yours | Yours | Local models (Ollama, LM Studio), self-hosted gateways, paid APIs |

## Choosing a model

The job is a long, structured extraction: read a timestamped transcript, return a Markdown table. What matters:

- **Context window** — bigger is better. 128k models can take an hour-long lecture in one pass.
- **Instruction adherence** — the parser expects a table with the exact columns the prompt asks for. Chatty models break it.
- **Cost per token** — transcripts are long; input tokens dominate the bill.

| Model class | Chunking | Notes |
| :--- | :--- | :--- |
| Qwen 3.8 Max (AIKit default) | Off | Full-context pass, no merge step |
| GLM 5.3 and other 128k models | Off | Enable **Disable chunking** |
| Small/fast models (Gemma, mini-class) | On | 30-minute chunks, merged in order |
| Local models | On | Custom provider splits into ~3,800-character pieces to respect small server limits |

## How chunking works

**Step 1:** The transcript is read and every line is validated for a timecode. Lines without one are dropped; if nothing survives, the run fails instead of sending garbage.

**Step 2:** With chunking on, the text is split at **30-minute boundaries** of video time, never mid-sentence where avoidable.

**Step 3:** Each chunk is sent as its own request with the same prompt, and progress is reported per chunk.

**Step 4:** Rows come back and are merged in video order, de-duplicated, and sorted by timestamp before the table is drawn.

Custom endpoints get character-based splitting (~3,800 chars) instead, because small self-hosted servers reject long prompts outright.

## Custom profiles

Keep several endpoints saved and switch without retyping keys:

**Step 1:** In **Settings → AI Provider**, choose **Custom**.

**Step 2:** Fill base URL, key and model, then give the profile a name.

**Step 3:** **Save profile**. It appears in the profile picker and in `customProfiles`.

**Step 4:** Toggle **Disable chunking** per profile if the model has a large context.

Typical base URLs:

| Server | Base URL |
| :--- | :--- |
| Ollama | `http://localhost:11434/v1` |
| LM Studio | `http://localhost:1234/v1` |
| llama.cpp server | `http://127.0.0.1:8080/v1` |
| OpenAI | `https://api.openai.com/v1` |

Local servers need no key — put any non-empty string in the key field.

## Verifying before you spend

**Verify** in Settings sends a tiny request and reports the HTTP status. Do this after any key or model change: a wrong model slug otherwise fails after a two-hour transcript has already been uploaded.

## Cost control

- Prefer `autoGenerate` off and generate on demand.
- Keep the transcript in the Editor and re-run only when the model or prompt changes.
- Save to Turso once — reloading a saved list costs nothing.
- Use the smallest model that still returns clean tables for your subject.
