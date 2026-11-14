# Configuration

Everything lives in **⚙️ Settings** and is stored in `chrome.storage.local` on your machine.

## How chapters get written

| Setting | What it does |
| --- | --- |
| **Use my own AI API** | Off = **Manual mode** (default). On = API mode. |

In **Manual mode** the AI-provider card and both generate buttons are hidden, and **🧠 Copy skill** appears in the Editor. Switching to Manual also clears *Generate chapters when a video opens*, so a hidden toggle cannot fire.

## Transcript

| Setting | What it does |
| --- | --- |
| **TranscriptAPI key** | Your own key for the transcript fallback service. **Required** when YouTube's captions are unavailable, and always for embedded players. There is no built-in key. |
| **Copy transcript to clipboard when a video opens** | Grabs the transcript automatically and shows a notification. |

## Chapters

| Setting | What it does |
| --- | --- |
| **Show chapter card during playback** | On by default. A glass card names each chapter as playback reaches it. |
| **Generate chapters when a video opens** | API mode only. |
| **Auto save & comment** | Saves to Turso and posts the comment when chapters are ready. |

## Appearance and behaviour

| Setting | What it does |
| --- | --- |
| **UI theme** | Warm, Neutral, Butter, Chocolate, Matcha, Stone, Gothic, Y2K — each with a light and dark variant that follows YouTube. |
| **Mini floating player** | Small bottom widget with previous / next. |
| **Sound alert** | Chime when generation finishes; volume and custom sound supported. |

See [ai-providers.md](ai-providers.md) for the provider fields, and [transcripts.md](transcripts.md) for the transcript path.
