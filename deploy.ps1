# deploy.ps1 - Deploy all changes to GitHub + Vercel
# Usage:
#   .\deploy.ps1 "your commit message"
#   Set env var to skip prompt:
#     $env:GITHUB_TOKEN = "rajawhatapi2-bit token"

param(
    [string]$CommitMessage = ""
)

$root = $PSScriptRoot

Write-Host ""
Write-Host "=== AMOHA Deploy Script (rajawhatapi2-bit) ===" -ForegroundColor Cyan

# --- Commit message: param > prompt ---
if (-not $CommitMessage) {
    $CommitMessage = Read-Host "Enter commit message (leave blank to skip commit)"
}
$commitMsg = $CommitMessage

# --- GitHub token: env var > prompt ---
$token = $env:GITHUB_TOKEN
if (-not $token) {
    $token = Read-Host "Enter rajawhatapi2-bit GitHub token (or set `$env:GITHUB_TOKEN to skip)"
}
if (-not $token) { Write-Host "Token is required." -ForegroundColor Red; exit 1 }

Set-Location $root

# --- Step 1: Commit ---
if ($commitMsg) {
    Write-Host ""
    Write-Host "[1/4] Committing changes..." -ForegroundColor Yellow
    git add -A
    git commit -m $commitMsg
}

# --- Step 2: Push main codebase to rajawhatapi2-bit/amoha-mobiles ---
Write-Host ""
Write-Host "[2/4] Pushing to rajawhatapi2-bit/amoha-mobiles..." -ForegroundColor Yellow
git push "https://rajawhatapi2-bit:$token@github.com/rajawhatapi2-bit/amoha-mobiles.git" main
Write-Host "Done." -ForegroundColor Green

# --- Step 3: Push frontend/ to rajawhatapi2-bit/amoha-frontend ---
Write-Host ""
Write-Host "[3/4] Pushing frontend to Vercel repo..." -ForegroundColor Yellow
git branch -D frontend-split 2>&1 | Out-Null
git subtree split --prefix=frontend -b frontend-split | Out-Null
git push "https://rajawhatapi2-bit:$token@github.com/rajawhatapi2-bit/amoha-frontend.git" frontend-split:main --force
git branch -D frontend-split 2>&1 | Out-Null
Write-Host "Frontend deployed." -ForegroundColor Green

# --- Step 4: Push admin/ to rajawhatapi2-bit/amoha-admin ---
Write-Host ""
Write-Host "[4/4] Pushing admin to Vercel repo..." -ForegroundColor Yellow
git branch -D admin-split 2>&1 | Out-Null
git subtree split --prefix=admin -b admin-split | Out-Null
git push "https://rajawhatapi2-bit:$token@github.com/rajawhatapi2-bit/amoha-admin.git" admin-split:main --force
git branch -D admin-split 2>&1 | Out-Null
Write-Host "Admin deployed." -ForegroundColor Green

Write-Host ""
Write-Host "=== All done! Vercel will auto-deploy in ~2 minutes ===" -ForegroundColor Cyan
Write-Host "  Main Repo: https://github.com/rajawhatapi2-bit/amoha-mobiles"
Write-Host "  Frontend:  https://amoha-frontend.vercel.app"
Write-Host "  Admin:     https://amoha-admin-seven.vercel.app"
Write-Host "  Backend:   https://amoha-backend.onrender.com"
Write-Host ""
