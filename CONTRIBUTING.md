# Contributing

Thanks for wanting to improve YT Smart Chapters Pro. This file covers how to set up, what to change where, and what a good pull request looks like.

## Before you start

- **Bug?** Open an issue with the browser version, the video URL and the console output from both the panel and the service worker.
- **Security problem?** Follow [SECURITY.md](SECURITY.md) — do not open a public issue.
- **Feature?** Open an issue first so we agree on scope before you write code.

## Setup

```bash
git clone https://github.com/pavnxet/yt-timestamp-skipper.git
cd yt-timestamp-skipper
```

Load the folder unpacked in `chrome://extensions/` (Developer mode → **Load unpacked**). There is no build step, no package manager and no dependencies — keep it that way.

## Where things live

| You want to change | Edit |
| :--- | :--- |
| Panel layout, transcript extraction, chapter parsing, filters | `content.js` |
| Colours, spacing, themes, responsive rules | `content.css` |
| AI calls, prompts, transcript API, SponsorBlock, Turso | `background.js` |
| The ⚡ launcher on third-party sites | `embed-launcher.js` |
| Permissions, script injection, version | `manifest.json` |
| Docs | `README.md`, `docs/*.md` |

## Conventions

- **Prefix every injected DOM id with `yt-sk-`.** YouTube owns everything else.
- **All network requests go in `background.js`.** Content scripts message it; they never `fetch` an API directly.
- **Prompts live in two places.** `background.js` and `docs/toolkit/` — change both in the same commit.
- **4-space indent, semicolons, single quotes.** New code prefers `async`/`await`.
- **No frameworks, no CDNs.** The extension must run offline apart from its API calls.
- **A new theme is CSS only** — a `[data-yt-sk-theme="…"]` block plus an `<option>` in the settings markup.

## Testing a change

1. Reload the extension card, then reload the YouTube tab.
2. Open a lecture with captions and run: transcript → generate → filter chips → `]` / `[` → save → comment.
3. For SponsorBlock changes, test with a short video and a low-risk category first.
4. Check the panel at a narrow window width and in at least two themes.

There is no automated test suite; describe what you tested in the pull request.

## Commits and pull requests

- One logical change per pull request.
- Commit subject in the imperative, under 72 characters: `fix: keep markers after seek`.
- Update `CHANGELOG.md` under **Unreleased**.
- If the change affects behaviour, update the relevant file in `docs/` — a code change without a doc change will be asked for one.
- Screenshots help for UI changes; before/after is ideal.

## Code of conduct

Be decent. Critique code, not people. Assume the other person is also trying to help students get through a two-hour lecture.
