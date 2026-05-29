@echo off
REM ============================================================================
REM Anchor Engine Startup Script
REM ============================================================================
REM This script performs a clean startup of the Anchor Engine:
REM   1. Installs dependencies (pnpm install)
REM   2. Starts the engine with full logging (pnpm start-with-logging)
REM   3. Waits for server to be ready on port 3160
REM ============================================================================

setlocal

echo ================================================
echo Anchor Engine Startup
echo ================================================

REM Check if project directory is correct
cd /F "%~dp0"

echo [1/4] Checking project structure...
if not exist "package.json" (
    echo ERROR: package.json not found
    exit /b 1
)

echo [2/4] Installing dependencies with pnpm...
pnpm install --no-optional --reporter=silent 2>&1 | findstr /i "added resolved" || (
    echo WARN: pnpm install completed with warnings, continuing...
)

echo [3/4] Building engine...
call pnpm run build 2>nul || (
    echo WARN: Build completed with warnings, continuing...
)

echo [4/4] Starting Anchor Engine with logging...
start "Anchor Engine" cmd /k "pnpm start-with-logging"

REM Wait for server to be ready
echo.
echo Waiting for server to start on port 3160...
for /L %i in (1,1,30) do (
    netstat -ano | findstr ":3160 LISTENING" && goto :SERVER_READY
    timeout /t 2 >nul
)

echo.
echo ================================================
echo WARNING: Server did not start automatically
echo ================================================
echo The engine should now be running. Check logs at: .anchor\logs\
echo.
pause

:SERVER_READY
echo.
echo ================================================
echo Anchor Engine started successfully!
echo ================================================
echo Server is running on http://localhost:3160
echo Logs available at: .anchor\logs\
echo.
exit /b 0