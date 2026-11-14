<!-- verified-at: 966abaa · 2026-11-13 -->
# Persistent Learnings & Domain Knowledge

## [area: setup]
- [CONVENTION] Initialize new projects by running `scripts/setup.ps1` (Windows) or `scripts/setup.sh` (Linux/macOS) to configure githooks and denylist. (v:2026-11-13 · high · S-20261113-0000)
- [CONVENTION] Fill in Section 12 (Project Profile) in `AGENTS.md` before starting initial feature development. (v:2026-11-13 · high · S-20261113-0000)

## [area: security]
- [PITFALL] Never add `learning/` to `.gitignore`. AI agent memory must be tracked in version control across branches and collaborators. (v:2026-11-13 · high · S-20261113-0000)
- [PITFALL] Redact all personal names, emails, credentials, and local absolute paths from memory files before saving. (v:2026-11-13 · high · S-20261113-0000)

## [area: workflow]
- [CONVENTION] Triage every task into T0-T3 and provide a proposal before modifying source files. (v:2026-11-13 · high · S-20261113-0000)
- [CONVENTION] Log a session entry in `summary.md` only when side effects or modifications occur. (v:2026-11-13 · high · S-20261113-0000)
