@echo off
REM ============================================
REM GitHub Cleanup Verification Script
REM ============================================

echo ============================================
echo GitHub Cleanup Testing Framework
echo ============================================
echo.

set "LOG_DIR=C:\Users\rsbii\.anchor\logs"
set "SERVER_URL=http://localhost:3160"
echo Log Directory: %LOG_DIR%
echo Server URL: %SERVER_URL%
echo.

REM Step 1: Check if server is running
echo [STEP 1] Checking if server is running...
for /f "tokens=2" %%a in ('netstat -ano ^| findstr :3160') do (
    if not "%%a"=="TCP" (
        echo [OK] Server is running on port 3160
        goto :next_step
    ) else (
        echo [FAIL] Server is NOT running
        echo Please start the server with: pnpm start-with-logging
        pause
        exit /b 1
    )
)

:next_step
echo.

REM Step 2: Check log directory
echo [STEP 2] Checking log directory...
if exist "%LOG_DIR%" (
    echo [OK] Log directory exists: %LOG_DIR%
    dir "%LOG_DIR%" /b | findstr /C:"anchor_engine.log"
) else (
    echo [FAIL] Log directory does not exist
    pause
    exit /b 1
)

REM Step 3: Check frontend GitHub icon color (visual)
echo.
echo [STEP 3] Frontend UI check:
echo [INFO] Open http://localhost:3160 in your browser
echo [INFO] The GitHub icon in the navbar should be WHITE (not gray)
echo.

REM Step 4: Provide testing instructions
echo ============================================
echo TESTING INSTRUCTIONS
echo ============================================
echo 1. Open http://localhost:3160 in your browser
echo 2. Click the GitHub icon in the navbar (should be white)
echo 3. Enter: https://github.com/RSBalchII/Coding-Notes
echo 4. Click "Ingest Repository"
echo 5. Open: C:\Users\rsbii\.anchor\logs\anchor_engine.log
echo 6. Look for these messages:
echo    - [GitHub] WARNING: X old atoms detected
echo    - [GitHub] Cleaning up orphaned data
echo    - [GitHub] ✅ Cleanup complete
echo    - [GitHub] ✅ Ingestion complete
echo ============================================
echo.
echo Verification script completed.
pause
