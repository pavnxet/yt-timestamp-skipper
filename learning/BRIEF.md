<!-- verified-at: 96246b1 · 2026-11-18 · rewritten whole, not appended -->
# BRIEF: cold-start summary

## State (≤ 5 lines)
Chrome MV3 extension, v3.9.1, live and self-updating. One content script (`content.js`, ~224 KB) holds all UI and logic; no bundler, no framework, no committed test runner. Releases are self-hosted: pushing a `v*` tag signs a CRX3 and publishes `updates.xml` to the GitHub release, and installed copies update from there. Manual (skill-copy) generation is the default; API mode is opt-in. There is no shared credential of any kind — users supply their own AI and transcript keys.

## Active work / handoff
- S-20261118-0000 · DONE · panel toggle shortcut (`Alt+M`) shipped as v3.9.1 · next: make `Alt+S` (sponsor marker) rebindable — it is still hardcoded · blocked on: none

## Top pitfalls (≤ 10, most expensive to rediscover first)
- parsing: a chapter title may contain `|`. Table sniffing must require a **leading** `|`; `line.includes('|')` silently dropped every chapter -> learning.md [area: parsing]
- layout: overlay UI goes on `document.fullscreenElement || document.body`. Parenting to `.html5-video-player` clips it (`overflow: hidden`) -> learning.md [area: layout]
- layout: `getBoundingClientRect()` is viewport-relative — never mix it with a host element's height -> learning.md [area: layout]
- storage: `shortcuts` is one object. Assigning it wholesale (`shortcuts = res.shortcuts`) makes every newly added key `undefined` for existing users, so the shortcut silently dies. Merge over defaults -> learning.md [area: storage]
- input: the shortcut recorder and the global keydown handler both fire on the same press. Without a recording guard, rebinding a key also triggers its old action -> learning.md [area: shortcuts]
- build: the skill text has 41 backticks; embed it JSON-escaped, never in a template literal -> learning.md [area: build]
- release: never regenerate `CRX_PRIVATE_KEY` — the extension ID derives from it -> learning.md [area: release]
- workflow: the Actions token cannot create files under `.github/workflows/`; `workflows` is not a valid `permissions:` key -> learning.md [area: build]

## Verified commands
- syntax: `node --check content.js` (~0.2s)
- scanner: `python scripts/scan_sensitive.py --all` (~2s, currently clean)
- release: tag `v*` → `.github/workflows/release-crx.yml`

## Where to look (task -> place)
- all UI + logic -> `content.js` (grep, never page it)
- styles + themes -> `content.css`
- release signing -> `scripts/pack-crx.mjs`, `docs/auto-update.md`
- stack & conventions -> `AGENTS.md` §12
- product decisions -> `learning/DECISIONS.md`
