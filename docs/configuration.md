# Configuration reference

Every option in the **⚙️ Settings** tab, plus the storage keys behind it. Settings are stored per browser profile in `chrome.storage.local` — not synced by Chrome, not sent to the author.

## Automation

| Setting | Storage key | Default | Behaviour |
| :--- | :--- | :--- | :--- |
| Generate chapters when a video opens | `autoGenerate` | `false` | Fetches the transcript and generates chapters on every watch page. Costs one AI call per video. |
| Copy transcript to clipboard | `autoCopyTranscript` | `false` | Copies the timestamped transcript when a video opens, then notifies you. Untimed text is rejected. |
| Auto Save & Comment | `autoSaveSync` | `false` | Saves to Turso and posts the comment as soon as chapters exist. |
| Auto upload ads to SponsorBlock | `autoUploadSb` | `false` | Runs segment detection after chapter generation, then uploads. |
| Post timestamps as a comment | `autoComment` | `true` | Controls whether Save also posts a comment. |

> **Cost warning:** `autoGenerate` and `autoUploadSb` together mean two AI calls per video. On a 200-video playlist that is a real bill. Enable them for a playlist you are actively studying, not globally.

## AI

| Setting | Storage key | Notes |
| :--- | :--- | :--- |
| Provider | `aiProvider` | `aikit` (default), `openrouter`, `custom` |
| AIKit token / base URL / model | `aiToken`, `aiBaseUrl`, `aiModel` | Default base URL `https://claude.aikit.club/qwen.aikit.club/v1`, default model `qwen3.8-max` |
| OpenRouter key / model | `openrouterKey`, `openrouterModel` | Any OpenRouter model slug |
| Custom base URL / key / model | `customUrl`, `customApiKey`, `customModel` | Any OpenAI-compatible `/chat/completions` |
| Custom profile name | `customProviderName` | Label shown in the profile picker |
| Saved profiles | `customProfiles`, `customActiveProfileId` | Named bundles of URL + key + model |
| Disable chunking | `disableChunking` | Sends the whole transcript in one request. Only for 128k-context models. |

Details and cost notes: [ai-providers.md](ai-providers.md).

## Transcript

| Setting | Storage key | Notes |
| :--- | :--- | :--- |
| TranscriptAPI key | `transcriptApiKey` | Used when YouTube's panel is unavailable, and always for embeds. A built-in key is used if you leave it empty — set your own for reliability and fair use. |

## SponsorBlock

| Setting | Storage key | Notes |
| :--- | :--- | :--- |
| Private user ID | `sbUserId` | 32+ characters (the UUID without dashes). This is the *private* ID, never the public one. |
| Category mode | `sbCategoryMode` | Which categories the detector targets when marking segments |

Details: [sponsorblock.md](sponsorblock.md).

## Turso

| Setting | Storage key | Notes |
| :--- | :--- | :--- |
| Database URL | `tursoUrl` | `libsql://your-db.turso.io` |
| Auth token | `tursoToken` | Database token, not an account token |

Details: [turso-sync.md](turso-sync.md).

## Interface

| Setting | Storage key | Default | Options |
| :--- | :--- | :--- | :--- |
| Theme | `uiTheme` | `warm` | `warm`, `neutral`, `butter`, `chocolate`, `matcha`, `stone` |
| Mini floating player | `showMiniWidget` | `false` | Small bottom widget with previous / next |
| Sound alert | `soundEnabled` | `true` | Completion chime on/off |
| Sound volume | `soundVolume` | `80` | 0–100 |
| Sound source | `soundUrl`, `soundCustomData` | `anime-wow.mp3` | URL, or a local file stored as a data URL |
| Shortcuts | `shortcuts` | `]`, `[`, `Alt+X` | `{ next, prev, add, addAlt }` |

## Resetting

There is no in-app reset. To start clean: open `chrome://extensions/`, open the extension's **service worker** devtools, and run

```js
chrome.storage.local.clear();
```

or remove and re-add the extension. Both wipe saved keys — Turso data survives, since it lives in your database.
