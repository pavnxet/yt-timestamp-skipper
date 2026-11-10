# Architecture

A Manifest V3 extension with no build step: the files in the repo are the shipped code.

## File map

| File | Role | Approx. size |
| :--- | :--- | :--- |
| `manifest.json` | MV3 config: permissions, content scripts, service worker | 2 KB |
| `content.js` | The whole UI and client engine — dashboard, transcript extraction, parsing, chapters, filters, markers | ~4,000 lines |
| `content.css` | Six themes as CSS custom properties, glassmorphism tokens, responsive layout | ~1,850 lines |
| `background.js` | Service worker — AI calls, transcript API, SponsorBlock, Turso, prompt templates | ~1,600 lines |
| `embed-launcher.js` | Injects the ⚡ launcher on non-YouTube pages that host an embedded player | 70 lines |
| `icons/` | 16 / 32 / 48 / 128 px PNGs and `logo.svg` | — |

## Content script targets

| Match | Frame | Scripts |
| :--- | :--- | :--- |
| `*.youtube.com/*`, `m.youtube.com` | top | `content.js`, `content.css` |
| `*.youtube.com/embed/*`, `*.youtube-nocookie.com/embed/*` | all frames | `content.js`, `content.css` |
| `<all_urls>` except YouTube | top | `embed-launcher.js` |

The third entry is what puts the launcher beside embedded players on course platforms and blogs. It injects a button, not the dashboard.

## Message flow

```text
content.js  ──chrome.runtime.sendMessage──▶  background.js
                                                 │
      fetchTranscriptFromApi ◀───────────────────┤ transcriptapi.com
      generateChapters       ◀───────────────────┤ AI provider
      analyzeRemovableSegments ◀─────────────────┤ AI provider
      generateAllInOne       ◀───────────────────┤ AI provider (chapters + segments)
      verifyAi / verifyOpenRouter ◀──────────────┤ AI provider (health check)
      fetchCustomModels      ◀───────────────────┤ custom endpoint (/models)
      submitSponsorBlock     ◀───────────────────┤ sponsor.ajay.app
      tursoQuery             ◀───────────────────┤ <db>/v2/pipeline
```

Every handler returns `true` from `onMessage` so the channel stays open for the async reply. The service worker is the only place that performs network requests, which keeps CORS handling in one place and survives tab navigation.

## Why the work happens in the service worker

- A content script is destroyed whenever YouTube swaps the page; an in-flight AI request would die with it.
- Host permissions live on the extension origin, so requests there are not subject to page CORS rules.
- Progress messages (`chunkProgress`) stream back to the panel while chunks complete.

## Storage schema (`chrome.storage.local`)

| Key | Type | Purpose |
| :--- | :--- | :--- |
| `aiProvider`, `aiToken`, `aiBaseUrl`, `aiModel` | string | AIKit credentials |
| `openrouterKey`, `openrouterModel` | string | OpenRouter credentials |
| `customUrl`, `customApiKey`, `customModel`, `customProviderName` | string | Active custom endpoint |
| `customProfiles`, `customActiveProfileId` | array, string | Saved endpoint bundles |
| `disableChunking` | boolean | Full-context mode |
| `tursoUrl`, `tursoToken` | string | Database connection |
| `sbUserId`, `sbCategoryMode` | string | SponsorBlock identity and scope |
| `transcriptApiKey` | string | Own TranscriptAPI key |
| `autoGenerate`, `autoCopyTranscript`, `autoSaveSync`, `autoUploadSb`, `autoComment` | boolean | Automation flags |
| `showMiniWidget`, `uiTheme` | boolean, string | Interface |
| `soundEnabled`, `soundUrl`, `soundVolume`, `soundCustomData` | mixed | Chime |
| `shortcuts` | object | `{ next, prev, add, addAlt }` |

Turso holds the durable copy of chapter lists in `video_timestamps(video_id, timestamps)`; `chrome.storage.local` is the fast local cache.

## Transcript extraction strategy

1. Modern tabbed transcript view — `transcript-segment-view-model` elements.
2. Legacy renderer — `ytd-transcript-segment-renderer`.
3. Node walk over the panel container, discarding hidden/dummy panels.
4. TranscriptAPI over HTTPS from the service worker.

Each stage validates that a timecode exists before returning, so a partial DOM match cannot produce an untimed transcript.

## Chunking

- Default: 1,800-second (30-minute) video-time windows, split at segment boundaries.
- Custom endpoints: ~3,800-character windows, because small servers reject long prompts.
- 128k models: a single full-context pass when **Disable chunking** is on.

## Porting to Firefox

The blockers are concrete: `chrome.*` promise APIs, `background.service_worker` (Firefox uses an event page or a `scripts` array), and `web_accessible_resources` shape. A port means a manifest variant plus a promise shim — no architectural change. Nothing in the code depends on Chrome-only rendering.

## Testing without publishing

Load the folder unpacked, open a lecture with captions, and run the flows in [development.md](development.md). There is no test suite; the browser is the harness.
