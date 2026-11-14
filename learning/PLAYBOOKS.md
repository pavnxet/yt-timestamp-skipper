# Playbooks & Task Recipes

## Setup New Clone / Project from Template (v:2026-11-13 · verified-at init)
1. Run `./scripts/setup.sh` (macOS/Linux) or `.\scripts\setup.ps1` (Windows).
2. Edit `.git/agent-denylist.txt` to add your real name, machine username, personal handles, and sensitive terms (never committed).
3. Run `python scripts/scan_sensitive.py --doctor` to verify `doctor: OK`.
4. Fill in Section 12 (Project Profile) in `AGENTS.md`.
5. Update `learning/BRIEF.md` with initial project state.
Gotchas: Ensure Python is installed and git user.email is a noreply address. Verify with: `python scripts/scan_sensitive.py --doctor`.

## Run Pre-Commit Safety Scan Manually (v:2026-11-13 · verified-at init)
1. Stage your changes explicitly: `git add <file1> <file2>`.
2. Run `python scripts/scan_sensitive.py --staged`.
3. If violations are reported, redact sensitive values before committing.
Gotchas: Never use `git add -A`. Verify with: `git diff --cached --stat`.
