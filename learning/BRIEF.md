<!-- verified-at: 966abaa · 2026-11-13 · rewritten whole, not appended -->
# BRIEF: cold-start summary

## State (≤ 5 lines)
Initial template repository setup for AI agent memory and governance protocol v2.0. Clean slate ready for project adoption.

## Active work / handoff
- S-20261113-0000 · DONE · next: Clone template, run setup script, fill Project Profile in AGENTS.md · blocked on: none

## Top pitfalls (≤ 10, most expensive to rediscover first)
- git: Never ignore learning/ in .gitignore; memory files must be committed and pushed -> learning.md [area: git]
- security: Never commit real credentials or personal information; keep denylist in .git/agent-denylist.txt -> learning.md [area: security]
- editing: Always present a proposal before editing files unless explicit session grant is active -> learning.md [area: workflow]

## Verified commands
- scan doctor: `python scripts/scan_sensitive.py --doctor` (~1s)
- test staged: `python scripts/scan_sensitive.py --staged` (~1s)

## Where to look (task -> place)
- setup & hooks -> `scripts/`, `.githooks/`, [area: tooling]
- ADR records -> `learning/DECISIONS.md`
- project stack & conventions -> `AGENTS.md` §12
