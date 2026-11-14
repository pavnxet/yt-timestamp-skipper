#!/bin/bash
set -e

echo "Setting up AI Agent Safety Kit and Git Hooks..."

# 1. Configure git hooks directory
git config core.hooksPath .githooks
chmod +x .githooks/* || true
echo "[OK] Configured git core.hooksPath to .githooks"

# 2. Check / Create private agent denylist in .git/
DENYLIST=".git/agent-denylist.txt"
if [ ! -f "$DENYLIST" ]; then
    cat << 'EOF' > "$DENYLIST"
# Private Agent Denylist (ONE TERM PER LINE)
# This file lives in .git/ and is NEVER committed or tracked.
# Add your real name, machine username, personal handles, employer, or custom keywords:
# example:
# John Doe
# my-secret-project
EOF
    echo "[OK] Created initial private denylist at .git/agent-denylist.txt"
    echo "     Please edit .git/agent-denylist.txt to add your personal name / machine terms."
else
    echo "[OK] Private denylist already exists at .git/agent-denylist.txt"
fi

# 3. Check git email
USER_EMAIL=$(git config user.email || true)
if [ -z "$USER_EMAIL" ]; then
    echo "[WARN] git user.email is not configured!"
    echo "       Consider setting a GitHub noreply address:"
    echo "       git config user.email '<id>+<handle>@users.noreply.github.com'"
elif [[ "$USER_EMAIL" != *"noreply"* ]]; then
    echo "[WARN] git user.email '$USER_EMAIL' is not a GitHub noreply email address."
else
    echo "[OK] git user.email is noreply ($USER_EMAIL)"
fi

# 4. Run safety doctor
echo ""
echo "Running scanner doctor check..."
python3 scripts/scan_sensitive.py --doctor || python scripts/scan_sensitive.py --doctor
