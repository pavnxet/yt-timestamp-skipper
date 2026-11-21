<!-- verified-at: 2b88e25 · 2026-11-21 · rewritten whole, not appended -->
# BRIEF: cold-start summary

## State (≤ 5 lines)
Chrome MV3 extension, v3.9.3, live and self-updating. One content script (`content.js`, ~230 KB) holds all UI and logic; no bundler, no framework, no committed test runner. Releases are self-hosted: pushing a `v*` tag signs a CRX3 and publishes `updates.xml` to the GitHub release, and installed copies update from there. Manual (skill-copy) generation is the default; API mode is opt-in. There is no shared credential of any kind — users supply their own AI and transcript keys.

## Active work / handoff
- S-20261121-0001 · DONE · SponsorBlock upload silent drops fixed in v3.9.3 (standard client userAgent, drop detection, live duration guard, Hindi skill heading support) · next: tag v3.9.3 release if user requests · blocked on: none

## Top pitfalls (≤ 10, most expensive to rediscover first)
- sponsorblock: `userAgent` must match an approved client signature (e.g. `mnjggcdmjocbbbhaepdhchncahnbgone/v5.10.4`). Custom names trigger silent drops (`action: "drop"`) returning HTTP 200 `"OK"` with 0 DB writes -> learning.md [area: sponsorblock]
- sponsorblock: official client has `filler` and `selfpromo` disabled by default in extension settings; they won't render on the seekbar until enabled -> learning.md [area: sponsorblock]
- sponsorblock: `highlight` is not a category; it is `poi_highlight`. One bad category 400s the whole batch -> learning.md [area: sponsorblock]
- parsing: a chapter title may contain `|`. Table sniffing must require a **leading** `|`; `line.includes('|')` silently dropped every chapter -> learning.md [area: parsing]
- layout: overlay UI goes on `document.fullscreenElement || document.body`. Parenting to `.html5-video-player` clips it (`overflow: hidden`) -> learning.md [area: layout]
- layout: `getBoundingClientRect()` is viewport-relative — never mix it with a host element's height -> learning.md [area: layout]
- storage: `shortcuts` is one object. Assigning it wholesale (`shortcuts = res.shortcuts`) makes every newly added key `undefined` for existing users, so the shortcut silently dies. Merge over defaults -> learning.md [area: storage]
- input: the shortcut recorder and the global keydown handler both fire on the same press. Without a recording guard, rebinding a key also triggers its old action -> learning.md [area: shortcuts]
- build: the skill text has 41 backticks; embed it JSON-escaped, never in a template literal -> learning.md [area: build]
- release: never regenerate `CRX_PRIVATE_KEY` — the extension ID derives from it -> learning.md [area: release]

## Verified commands
- syntax: `node --check content.js` (~0.2s)
- scanner: `python scripts/scan_sensitive.py --all` (~2s, currently clean)
- release: tag `v*` → `.github/workflows/release-crx.yml`
- mirror: manual only — Actions tab → Mirror to Codeberg → Run workflow

## Where to look (task -> place)
- all UI + logic -> `content.js` (grep, never page it)
- styles + themes -> `content.css`
- release signing -> `scripts/pack-crx.mjs`, `docs/auto-update.md`
- stack & conventions -> `AGENTS.md` §12
- product decisions -> `learning/DECISIONS.md`
