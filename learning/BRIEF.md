<!-- verified-at: 8dc1daf · 2026-11-14 · rewritten whole, not appended -->
# BRIEF: cold-start summary

## State (≤ 5 lines)
Chrome MV3 extension, v3.8.1, live and self-updating. One content script (`content.js`, ~222 KB) holds all UI and logic; no bundler, no framework, no committed test runner. Releases are self-hosted: pushing a `v*` tag signs a CRX3 and publishes `updates.xml` to the GitHub release, and installed copies update from there. Manual (skill-copy) generation is the default mode; API mode is opt-in.

## Active work / handoff
- S-20261114-0000 · DONE · adopted the learnings-for-agents memory + safety template · next: rotate the hardcoded transcript API key in `background.js` · blocked on: none

## Top pitfalls (≤ 10, most expensive to rediscover first)
- parsing: a chapter title may contain `|`. Table sniffing must require a **leading** `|`; `line.includes('|')` silently dropped every chapter -> learning.md [area: parsing]
- layout: overlay UI goes on `document.fullscreenElement || document.body`. Parenting to `.html5-video-player` clips it (`overflow: hidden`) -> learning.md [area: layout]
- layout: `getBoundingClientRect()` is viewport-relative — never mix it with a host element's height -> learning.md [area: layout]
- timing: YouTube re-renders the progress bar; a listener bound once at boot may never attach -> learning.md [area: timing]
- build: the skill text has 41 backticks; embed it JSON-escaped, never in a template literal -> learning.md [area: build]
- release: never regenerate `CRX_PRIVATE_KEY` — the extension ID derives from it -> learning.md [area: release]
- security: `background.js` ships a live `DEFAULT_TRANSCRIPT_API_KEY`; CI fails until rotated -> learning.md [area: security]

## Verified commands
- syntax: `node --check content.js` (~0.2s)
- scanner: `python scripts/scan_sensitive.py --all` (~2s, currently 1 real finding)
- release: tag `v*` → `.github/workflows/release-crx.yml`

## Where to look (task -> place)
- all UI + logic -> `content.js` (grep, never page it)
- styles + themes -> `content.css`
- release signing -> `scripts/pack-crx.mjs`, `docs/auto-update.md`
- stack & conventions -> `AGENTS.md` §12
