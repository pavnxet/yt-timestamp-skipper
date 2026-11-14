# One-command setup script for Windows
Write-Host "Setting up AI Agent Safety Kit and Git Hooks..." -ForegroundColor Cyan

# 1. Configure git hooks directory
git config core.hooksPath .githooks
Write-Host "[OK] Configured git core.hooksPath to .githooks" -ForegroundColor Green

# 2. Check / Create private agent denylist in .git/
$denylistPath = Join-Path (Get-Location) ".git\agent-denylist.txt"
if (-not (Test-Path $denylistPath)) {
    @"
# Private Agent Denylist (ONE TERM PER LINE)
# This file lives in .git/ and is NEVER committed or tracked.
# Add your real name, machine username, personal handles, employer, or custom keywords:
# example:
# John Doe
# my-secret-project
"@ | Set-Content -Path $denylistPath -Encoding UTF8
    Write-Host "[OK] Created initial private denylist at .git\agent-denylist.txt" -ForegroundColor Green
    Write-Host "     Please edit .git\agent-denylist.txt to add your personal name / machine terms." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Private denylist already exists at .git\agent-denylist.txt" -ForegroundColor Green
}

# 3. Check git email
$userEmail = git config user.email
if (-not $userEmail) {
    Write-Host "[WARN] git user.email is not configured!" -ForegroundColor Yellow
    Write-Host "       Consider setting a GitHub noreply address:"
    Write-Host "       git config user.email '<id>+<handle>@users.noreply.github.com'" -ForegroundColor Yellow
} elseif ($userEmail -notmatch "noreply") {
    Write-Host "[WARN] git user.email '$userEmail' is not a GitHub noreply email address." -ForegroundColor Yellow
} else {
    Write-Host "[OK] git user.email is noreply ($userEmail)" -ForegroundColor Green
}

# 4. Run safety doctor
Write-Host "`nRunning scanner doctor check..." -ForegroundColor Cyan
python scripts/scan_sensitive.py --doctor
