@echo off
title MuseumPass Server
echo.
echo  ================================================
echo   MuseumPass Server Launcher
echo  ================================================
echo.
cd /d "%~dp0server"

echo  [1/3] Checking Node.js...
node --version || (echo ERROR: Node.js not found. Install from nodejs.org & pause & exit)

echo  [2/3] Installing dependencies (if needed)...
if not exist node_modules (
    echo  Installing server dependencies...
    call npm install
)

echo  [3/3] Seeding database (first-time setup)...
node -e "const db=require('./db');const r=db.prepare('SELECT COUNT(*) as c FROM admins').get();if(r.c===0){console.log('Running seed...');require('child_process').execSync('node seed.js',{stdio:'inherit'})}else{console.log('Database already seeded. Skipping.')}"

echo.
echo  ================================================
echo   Server starting at http://localhost:5000
echo   Login page: http://localhost:5000/auth.html
echo.
echo   Demo accounts:
echo     Customer: visitor@museum.com / visitor123
echo     Employee: EMP001 / staff123
echo     Admin:    admin / admin123
echo  ================================================
echo.

node server.js

pause
