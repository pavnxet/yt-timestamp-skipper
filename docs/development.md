# Development

## Layout

| File | Role |
| --- | --- |
| `content.js` | All UI and logic (~222 KB). Grep it, never page it. |
| `content.css` | Panel, themes, chapter card, tooltip. |
| `background.js` | Service worker: transcript fetch, AI calls, SponsorBlock. |
| `embed-launcher.js` | ⚡ launcher on embedded players. |
| `scripts/pack-crx.mjs` | Signs the CRX3 and writes `updates.xml`. |
| `AGENTS.md` | Agent protocol + project profile (§12). Read this before changing code. |
| `learning/` | Committed project memory — start with `learning/BRIEF.md`. |

## First-time setup

```bash
./scripts/setup.sh          # Windows: .\scripts\setup.ps1
```

This installs the git hooks, creates the private denylist at `.git/agent-denylist.txt`, and runs the safety doctor.

## Checks before you push

```bash
node --check content.js
node --check background.js
python scripts/scan_sensitive.py --all
```

The `secret-scan` workflow runs the same scanner plus Gitleaks on every push and pull request.

## House rules

- Bump `manifest.json` `version` — the release pipeline signs whatever is there.
- Add a `CHANGELOG.md` entry.
- Never regenerate `CRX_PRIVATE_KEY`: the extension ID derives from it, and a new key ends updates for every install.
- Chapter titles may contain `|`; table sniffing must require a **leading** pipe.
- Overlay UI goes on `document.fullscreenElement || document.body`.

## Releasing

Push a `v*` tag. See [auto-update.md](auto-update.md).
