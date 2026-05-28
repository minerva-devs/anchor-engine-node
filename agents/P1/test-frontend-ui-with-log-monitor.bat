@echo off
REM ============================================
REM Anchor Engine GitHub Cleanup Dual-Monitoring Framework
REM Tests frontend UI actions while monitoring backend logs in real-time
REM ============================================

REM Configuration
set "LOG_DIR=C:\Users\rsbii\.anchor\logs"
set "SERVER_URL=http://localhost:3160"
set "GITHUB_TEST_REPO=https://github.com/RSBalchII/Coding-Notes"

REM Create logs directory if it doesn't exist
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ============================================
echo GITHUB CLEANUP DUAL-MONITORING FRAMEWORK
echo ============================================
echo Server URL: %SERVER_URL%
echo Test Repo: %GITHUB_TEST_REPO%
echo Log Directory: %LOG_DIR%
echo ============================================
echo.

REM Create monitoring session
set "SESSION_FILE=%TEMP%\github_cleanup_test_%PID%.txt"
set "LOG_FILE=%LOG_DIR%github_cleanup_%DATE:~-4%%DATE:~-7,2%%DATE:~-10,2%.log"

(2>nul) echo session_start=%DATE% %TIME% > "%SESSION_FILE%"
(2>nul) echo server_url=%SERVER_URL% >> "%SESSION_FILE%"
(2>nul) echo test_repo=%GITHUB_TEST_REPO% >> "%SESSION_FILE%"

REM Step 1: Start server with logging (if not already running)
echo.
echo [STEP 1] Starting server with logging...
if not exist "%LOG_FILE%" (
    cd /d C:\Users\rsbii\Projects\anchor-engine-node
    echo Starting server...
    node --expose-gc engine/dist/index.js > "%LOG_FILE%" 2>&1
    timeout /t 3 /nobreak >nul
)

REM Verify server is running
for /f "tokens=2" %%a in ('netstat -ano ^| findstr :3160') do (
    if not "%%a"=="TCP" (
        echo [✓] Server is running on port 3160
        goto :monitor
    ) else (
        echo [✗] Server is NOT running on port 3160
        echo Please start the server first!
        pause
        exit /b 1
    )
)

REM Step 2: Open monitoring window
echo.
echo [STEP 2] Starting log monitor...
echo Monitoring %LOG_FILE% for GitHub-related messages...
echo Press Ctrl+C in this window to stop monitoring
echo ============================================
echo.
echo [GitHub Cleanup Monitor Started at %TIME%]
echo ============================================

REM Open a new PowerShell window for manual UI testing
powershell -NoExit -Command "
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host 'OPEN A NEW BROWSER WINDOW TO TEST THE UI' -ForegroundColor Cyan
Write-Host 'Go to http://localhost:3160/' -ForegroundColor Yellow
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'MONITORING WINDOW INSTRUCTIONS:' -ForegroundColor Green
Write-Host '  - Watch for GitHub-related log entries above' -ForegroundColor Green
Write-Host '  - Look for: [GitHub] WARNING, [GitHub] ✅ Cleaned up, [GitHub] ✅ Ingestion' -ForegroundColor Green
Write-Host '============================================='
pause
"

REM Step 3: Monitor logs in real-time (tail -f style)
echo.
echo [STEP 3] Real-time log monitoring active...
echo Filtered for GitHub operations and warnings...
echo.

(
    echo ============================================
    echo Starting real-time log monitoring
    echo Press Ctrl+C to stop
    echo ============================================
    echo.

    while true do (
        # Read last 50 lines of log file
        for /f "tokens=*" %%L in ('type "%LOG_FILE%" ^| findstr /n "" ^| tail -n 50') do (
            for /f "tokens=2 delims=:" %%N in ("%%L") do (
                echo [%%N] %%N: %%L
            )
        )
        
        echo.
        
        # Check for GitHub-related patterns
        findstr /C:"[GitHub]" "%LOG_FILE%" >nul 2>&1
        if %errorlevel% equ 0 (
            echo [!!!] GitHub activity detected - check above lines
        )
        
        echo -------------------------------------------
        echo Monitoring... (press Ctrl+C to exit)
        echo -------------------------------------------
        
        timeout /t 1 /nobreak >nul
    )
) 2>&1 | more

REM Cleanup session file
if exist "%SESSION_FILE%" del "%SESSION_FILE%" 2>nul

echo.
echo ============================================
echo Monitoring session ended
if exist "%LOG_FILE%" (
    echo Final log saved to: %LOG_FILE%
    echo To review, open: notepad "%LOG_FILE%"
)
echo ============================================
pause
