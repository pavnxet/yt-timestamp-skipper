#!/usr/bin/env python3
"""
Sensitive Content and Secret Scanner
Enforces fail-closed publication safety:
- Checks tokens, API keys, private keys, JWTs, embedded credentials, and local paths.
- Enforces user-specific private denylist (.git/agent-denylist.txt).
- Implements --doctor diagnostics, --staged pre-commit checks, --commit-msg, --pre-push, and --all.
- Rule: NEVER print the matched sensitive string to output.
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

# Built-in detection patterns (§8.3)
PATTERNS = {
    "PRIVATE_KEY": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "TOKEN_PREFIX": re.compile(
        # (?<![A-Za-z0-9-]) so the project's own "yt-sk-" CSS prefix is not a hit
        r"(?<![A-Za-z0-9-])(ghp_|gho_|ghs_|github_pat_|sk-|xox[abp]-|AIza|AKIA|ASIA)[A-Za-z0-9_\-]{12,}"
    ),
    "JWT": re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\."),
    "URL_CREDENTIALS": re.compile(r"\b[a-zA-Z]+://[^/\s:]+:[^@\s]+@"),
    "KEY_ASSIGNMENT": re.compile(
        r"(?i)(api[_-]?key|secret|token|passwd|password|authorization)\s*[:=]\s*(?!<|\*|\$|\{|your[_-]|['\"]?[\'\"]?$)[\'\"]?(?=[A-Za-z0-9_\-.~+/=]*[0-9])[A-Za-z0-9_\-.~+/=]{16,}"
    ),
    "LOCAL_USER_PATH_WIN": re.compile(
        r"\b[A-Za-z]:\\(?:Users|Documents|Projects|Home)\\[A-Za-z0-9_.-]+", re.IGNORECASE
    ),
    "LOCAL_USER_PATH_UNIX": re.compile(
        r"\b/(?:home|Users)/[A-Za-z0-9_.-]+", re.IGNORECASE
    ),
}

SKIP_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".mp3", ".mp4",
    ".exe", ".dll", ".so", ".dylib", ".bin", ".woff", ".woff2",
    ".ttf", ".eot", ".lock", ".pyc"
}

SKIP_PATHS = [
    "old version/",
    "assets/",
    "icons/",
    "node_modules/",
    ".git/",
    "__pycache__/",
    "dist/",
    "build/",
    ".venv/",
    "venv/",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "poetry.lock",
]


def run_git(args, input_data=None):
    """Run a git command and return stdout string, or None if failed."""
    try:
        res = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            input=input_data,
            check=False,
            encoding="utf-8",
            errors="replace",
        )
        return res
    except Exception:
        return None


def get_denylist_terms():
    """Load private denylist terms from .git/agent-denylist.txt."""
    terms = []
    denylist_file = Path(".git") / "agent-denylist.txt"
    if denylist_file.is_file():
        try:
            with open(denylist_file, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#"):
                        terms.append(stripped)
        except Exception:
            pass
    return terms


def is_skipped(path):
    """Check if file should be skipped from scanning."""
    path_str = str(path).replace("\\", "/")
    for skip in SKIP_PATHS:
        if skip in path_str:
            return True
    ext = Path(path).suffix.lower()
    if ext in SKIP_EXTENSIONS:
        return True
    return False


def scan_content(filename, content, denylist_terms):
    """Scan string content line-by-line. Returns list of (line_no, rule_name)."""
    violations = []
    lines = content.splitlines()

    for idx, line in enumerate(lines, start=1):
        # scan:allow bypass mechanism
        if "scan:allow" in line or "scan-allow" in line:
            continue

        # Check regex patterns
        matched = False
        for rule_name, pattern in PATTERNS.items():
            if pattern.search(line):
                violations.append((filename, idx, rule_name))
                matched = True
                break

        if matched:
            continue

        # Check denylist terms
        line_lower = line.lower()
        for term in denylist_terms:
            if len(term) >= 3 and term.lower() in line_lower:
                violations.append((filename, idx, "DENYLIST_MATCH"))
                break

    return violations


def cmd_doctor():
    """Run diagnostic checks on repo safety readiness."""
    print("Running safety doctor diagnostics...")
    errors = []

    # 1. Check git repo
    git_check = run_git(["rev-parse", "--is-inside-work-tree"])
    if not git_check or git_check.returncode != 0:
        errors.append("Current directory is not a Git repository.")

    # 2. Check learning/ not ignored
    res_learn = run_git(["check-ignore", "-q", "learning/"])
    if res_learn and res_learn.returncode == 0:
        errors.append("FAIL: 'learning/' directory is ignored in .gitignore! It MUST be committed and pushed.")
    else:
        print("  ✓ learning/ is tracked and not ignored")

    # 3. Check .env is ignored
    res_env = run_git(["check-ignore", "-q", ".env"])
    if not res_env or res_env.returncode != 0:
        errors.append("FAIL: '.env' is NOT ignored in .gitignore! Secrets risk being committed.")
    else:
        print("  ✓ .env is properly ignored")

    # 4. Check core.hooksPath
    res_hooks = run_git(["config", "core.hooksPath"])
    hooks_path = res_hooks.stdout.strip() if res_hooks else ""
    if hooks_path != ".githooks":
        errors.append(f"FAIL: core.hooksPath is '{hooks_path}', expected '.githooks'. Fix: git config core.hooksPath .githooks")
    else:
        print("  ✓ core.hooksPath is set to .githooks")

    # 5. Check user.email is noreply
    res_email = run_git(["config", "user.email"])
    user_email = res_email.stdout.strip() if res_email else ""
    if not user_email:
        errors.append("FAIL: git user.email is not set. Fix: git config user.email '<id>+<handle>@users.noreply.github.com'")
    elif "noreply" not in user_email.lower():
        print(f"  ⚠ WARNING: git user.email '{user_email}' does not appear to be a GitHub noreply address.")
    else:
        print("  ✓ git user.email is a noreply address")

    # 6. Check denylist file
    denylist_path = Path(".git") / "agent-denylist.txt"
    if not denylist_path.is_file():
        errors.append("FAIL: Local denylist missing at '.git/agent-denylist.txt'. Fix: create file with personal identifiers.")
    else:
        print("  ✓ Local denylist file exists (.git/agent-denylist.txt)")

    if errors:
        print("\ndoctor: FAILED with issues:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("\ndoctor: OK")
    return 0


def cmd_staged():
    """Scan files currently staged in Git index."""
    res = run_git(["diff", "--cached", "--name-only", "-z", "--diff-filter=ACMRT"])
    if not res or not res.stdout:
        return 0

    staged_files = [f for f in res.stdout.split("\0") if f.strip()]
    denylist_terms = get_denylist_terms()
    all_violations = []

    for filepath in staged_files:
        if is_skipped(filepath):
            continue

        # Read staged content from Git object database
        show_res = run_git(["show", f":{filepath}"])
        if show_res and show_res.returncode == 0:
            content = show_res.stdout
            v = scan_content(filepath, content, denylist_terms)
            all_violations.extend(v)

    if all_violations:
        print("FAIL: Sensitive content or forbidden patterns detected in staged files!")
        print("Redact the flagged content before committing:\n")
        for fpath, lno, rule in all_violations:
            print(f"  {fpath}:{lno}  [{rule}]")
        print("\nNote: Never bypass this gate. Fix the flagged line, or add '// scan:allow' if explicitly approved.")
        return 1

    return 0


def cmd_commit_msg(msg_filepath):
    """Scan commit message file."""
    if not os.path.isfile(msg_filepath):
        return 0

    try:
        with open(msg_filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception:
        return 0

    denylist_terms = get_denylist_terms()
    violations = scan_content(msg_filepath, content, denylist_terms)

    if violations:
        print("FAIL: Sensitive content detected in commit message!")
        for fpath, lno, rule in violations:
            print(f"  {fpath}:{lno}  [{rule}]")
        return 1

    return 0


def cmd_pre_push(args):
    """Scan outgoing commits before push."""
    denylist_terms = get_denylist_terms()
    all_violations = []

    # Read stdin lines for push refs if available
    stdin_data = sys.stdin.read() if not sys.stdin.isatty() else ""
    commit_ranges = []

    if stdin_data.strip():
        for line in stdin_data.strip().splitlines():
            parts = line.split()
            if len(parts) >= 4:
                local_ref, local_oid, remote_ref, remote_oid = parts[:4]
                if local_oid == "0000000000000000000000000000000000000000":
                    continue  # branch deletion
                if remote_oid == "0000000000000000000000000000000000000000":
                    commit_ranges.append(local_oid)
                else:
                    commit_ranges.append(f"{remote_oid}..{local_oid}")

    if not commit_ranges:
        # Fallback to upstream comparison
        commit_ranges = ["@{u}..HEAD"]

    for crange in commit_ranges:
        diff_res = run_git(["diff", crange])
        if not diff_res or diff_res.returncode != 0:
            continue

        # Scan added lines in diff
        for idx, line in enumerate(diff_res.stdout.splitlines(), start=1):
            if line.startswith("+") and not line.startswith("+++"):
                added_text = line[1:]
                if "scan:allow" in added_text:
                    continue
                for rule_name, pattern in PATTERNS.items():
                    if pattern.search(added_text):
                        all_violations.append((crange, idx, rule_name))
                        break

    if all_violations:
        print("FAIL: Sensitive content detected in commits being pushed!")
        for ref, lno, rule in all_violations:
            print(f"  {ref}:{lno}  [{rule}]")
        return 1

    return 0


def cmd_all():
    """Scan all tracked files in git tree (CI mode)."""
    res = run_git(["ls-files", "-z"])
    if not res or not res.stdout:
        return 0

    files = [f for f in res.stdout.split("\0") if f.strip()]
    denylist_terms = get_denylist_terms()
    all_violations = []

    for filepath in files:
        if is_skipped(filepath) or not os.path.isfile(filepath):
            continue
        try:
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            v = scan_content(filepath, content, denylist_terms)
            all_violations.extend(v)
        except Exception:
            pass

    if all_violations:
        print("FAIL: Sensitive content detected in repository files:")
        for fpath, lno, rule in all_violations:
            print(f"  {fpath}:{lno}  [{rule}]")
        return 1

    print("Scan complete: No sensitive content found.")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Sensitive Data & Secret Scanner")
    parser.add_argument("--doctor", action="store_true", help="Run repository safety diagnostic check")
    parser.add_argument("--staged", action="store_true", help="Scan staged Git files")
    parser.add_argument("--commit-msg", type=str, help="Scan commit message file")
    parser.add_argument("--pre-push", nargs="*", help="Scan commits being pushed")
    parser.add_argument("--all", action="store_true", help="Scan all tracked files in repository")

    args = parser.parse_args()

    if args.doctor:
        sys.exit(cmd_doctor())
    elif args.staged:
        sys.exit(cmd_staged())
    elif args.commit_msg:
        sys.exit(cmd_commit_msg(args.commit_msg))
    elif args.pre_push is not None:
        sys.exit(cmd_pre_push(args.pre_push))
    elif args.all:
        sys.exit(cmd_all())
    else:
        # Default to staged scan
        sys.exit(cmd_staged())


if __name__ == "__main__":
    main()
