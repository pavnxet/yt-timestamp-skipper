<!-- verified-at: 966abaa · 2026-11-13 -->
# Execution Flow & Module Map

## Entry Points
- `scripts/scan_sensitive.py`: Standalone CLI scanner and git hook entry point for secret & PII detection.
- `scripts/setup.ps1` / `scripts/setup.sh`: One-command bootstrap scripts for configuring local git hooks and denylist.

## Module Map
- `learning/`: Persistent memory hierarchy (BRIEF, learning, DECISIONS, EXECUTION_FLOW, PLAYBOOKS, TOOLS, summary, INCIDENTS).
- `scripts/scan_sensitive.py`: Core security utility implementing `--doctor`, `--staged`, `--commit-msg`, `--pre-push`, and `--all`.
- `.githooks/`: Git hooks intercepting commits and pushes locally.
- `.github/workflows/`: CI automation ensuring PRs and pushes remain free of sensitive data.

## Call Paths
- Git Commit: `git commit` -> `.githooks/pre-commit` -> `python scripts/scan_sensitive.py --staged` -> Staged diff checked -> PASS/FAIL
- Commit Message: Git -> `.githooks/commit-msg` -> `python scripts/scan_sensitive.py --commit-msg "$1"` -> PASS/FAIL
- Git Push: `git push` -> `.githooks/pre-push` -> `python scripts/scan_sensitive.py --pre-push` -> Commit range diff checked -> PASS/FAIL

## Data & Config
- `.git/agent-denylist.txt`: Private, untracked local file containing user-specific terms to block from commits.
- `.env.example`: Clean reference file containing environment variable names only (zero real secrets).
