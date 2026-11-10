# Development

## Setup

```bash
git clone https://github.com/pavnxet/yt-timestamp-skipper.git
cd yt-timestamp-skipper
```

There is no `npm install` and no bundler. Edit files, then click **Reload** on the extension card in `chrome://extensions/`.

## The loop

**Step 1:** Keep the panel's devtools open — right-click inside the panel → **Inspect**. `content.js` logs there.

**Step 2:** Keep the service worker's devtools open — `chrome://extensions/` → **service worker**. `background.js` logs there, including chunk progress and every outbound request.

**Step 3:** After editing `content.js` or `content.css`, reload the tab (not just the extension) so the content script re-injects.

**Step 4:** After editing `background.js` or `manifest.json`, press **Reload** on the extension card and then reload the tab.

## Conventions

| Area | Rule |
| :--- | :--- |
| DOM ids | Prefix `yt-sk-` so injected nodes never collide with YouTube's |
| Themes | Add a new theme as a `[data-yt-sk-theme="name"]` block of custom properties in `content.css`; no JS changes |
| Network | All `fetch` calls belong in `background.js`; content scripts message it |
| Prompts | Prompt text lives in `background.js` and is mirrored in `docs/toolkit/` — change both together |
| Formatting | 4-space indent, semicolons, single quotes, `async`/`await` over raw promise chains in new code |
| No dependencies | No frameworks, no CDN scripts; the extension must work offline except for its API calls |

## Adding a UI theme

**Step 1:** Copy an existing `[data-yt-sk-theme="…"]` block in `content.css`.

**Step 2:** Change the custom properties — `--canvas`, `--surface`, `--ink`, `--accent`, and the semantic colours.

**Step 3:** Add an `<option>` to `#yt-sk-theme-select` in `content.js`.

**Step 4:** Reload and check both light and dark OS settings.

## Adding an AI provider

**Step 1:** Add the base URL and credentials to the provider switch in `background.js`.

**Step 2:** Route it through the existing `callAiForChapters` path so chunking and merging stay shared.

**Step 3:** Add the fields to the settings load/save block in `content.js`.

**Step 4:** Document it in [ai-providers.md](ai-providers.md) and in the README table.

## Release checklist

1. Bump `version` in `manifest.json`.
2. Add a `CHANGELOG.md` entry with the date.
3. Confirm the new version string appears in the README badge and the panel header.
4. Test: fresh install → transcript → chapters → filter → `]` / `[` → save → comment → SponsorBlock dry run.
5. Tag the commit and attach a ZIP of the repo (without `old version/`) to the release.

## Reporting bugs

Include: browser and version, the video URL, the console output from both devtools, and the provider/model in use. The [issue template](https://github.com/pavnxet/yt-timestamp-skipper/issues/new) asks for exactly these.
