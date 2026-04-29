@echo off
title Push to GitHub – MuseumPass
color 0A
echo.
echo  =====================================================
echo   MuseumPass – Push All Files to GitHub
echo  =====================================================
echo.

cd /d "C:\Users\HP\OneDrive\Desktop\new"

echo [1/5] Current git status:
echo ─────────────────────────────────────────────────────
git status
echo.

echo [2/5] Force-adding database file (required for Vercel):
echo ─────────────────────────────────────────────────────
git add -f server/museumpass.db
if %ERRORLEVEL% EQU 0 (
    echo  ✅ server/museumpass.db staged.
) else (
    echo  ⚠️  Could not add museumpass.db – check if it exists.
)
echo.

echo [3/5] Staging ALL other changes...
echo ─────────────────────────────────────────────────────
git add -A
echo  Done.
echo.

echo [4/5] Committing...
echo ─────────────────────────────────────────────────────
git commit -m "Add seeded museumpass.db + fix routes and auth middleware"
echo.

echo [5/5] Pushing to GitHub...
echo ─────────────────────────────────────────────────────
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  main branch failed, trying master...
    git push origin master
)

echo.
echo  =====================================================
if %ERRORLEVEL% EQU 0 (
    echo   SUCCESS! All files pushed to GitHub.
    echo   Repo: https://github.com/sujal2152006/new
    echo.
    echo   NEXT STEP: Go to Vercel dashboard and redeploy!
    echo   https://vercel.com/dashboard
    echo.
    echo   DATABASE FLOW on Vercel:
    echo     1. museumpass.db is bundled with your repo
    echo     2. db.js copies it to /tmp/museumpass.db on cold start
    echo     3. All data is available immediately - no seeding needed
) else (
    echo   ERROR: Push failed. See messages above.
    echo   You may need to authenticate with GitHub.
    echo.
    echo   Run manually:
    echo     git add -f server/museumpass.db
    echo     git add -A
    echo     git push origin main
)
echo  =====================================================
echo.
pause
