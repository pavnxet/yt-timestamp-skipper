# Documentation — YT Smart Chapters Pro

Everything about installing, configuring and extending the extension. Start with **Getting started** if this is your first run; jump to **Troubleshooting** if something is broken.

| # | Guide | What it answers |
| :-: | :--- | :--- |
| 1 | [Getting started](getting-started.md) | How do I install it and get my first chapter list? |
| 2 | [Installation](installation.md) | Unpacked install, updates, what each permission is for |
| 3 | [Configuration](configuration.md) | What does every setting and storage key do? |
| 4 | [AI providers](ai-providers.md) | AIKit vs OpenRouter vs custom; models, cost, chunking |
| 5 | [Transcripts](transcripts.md) | Where transcripts come from, and why one is sometimes missing |
| 6 | [Chapters & filters](chapters-and-filters.md) | Reading the table, section chips, progress-bar markers |
| 7 | [SponsorBlock](sponsorblock.md) | Detection, paste format, categories, upload errors |
| 8 | [Turso sync](turso-sync.md) | Creating a libSQL database and syncing lists across devices |
| 9 | [Keyboard shortcuts](keyboard-shortcuts.md) | Defaults, rebinding, conflicts |
| 10 | [Troubleshooting](troubleshooting.md) | Symptom → cause → fix |
| 11 | [Architecture](architecture.md) | File map, message flow, storage schema |
| 12 | [Development](development.md) | Local workflow, conventions, release checklist |
| 13 | [FAQ](faq.md) | The long-form questions |

## Also in this folder

- **[toolkit/](toolkit/SKILL.md)** — the exact prompts the extension sends for chapters, MCQ timestamps and SponsorBlock segments. Copy them into any chat AI to reproduce the workflow by hand, for free.
- **index.html** — the GitHub Pages landing page.
- **assets/** — screenshots and brand files used by the landing page.

## Conventions used in these guides

- `Panel` = the dashboard the extension injects on the video page.
- `Editor` tab = the transcript + chapter table editor.
- `Chapters` tab = the generated chapter cards and filters.
- Timestamps are `MM:SS` under an hour and `HH:MM:SS` above it.
- "Provider" always means an OpenAI-compatible chat-completions endpoint.
