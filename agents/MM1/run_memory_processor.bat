@echo off
REM Memory Manager Multi-Agent Session Processor
REM Runs every morning and night to process all agent session logs
REM Use Windows Task Scheduler to run this batch file

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set LOG_FILE=%SCRIPT_DIR%.memory_processor.log
set START_TIME=%date% %time%

echo ======================================== > %LOG_FILE%
echo MEMORY MANAGER PROCESSOR - %START_TIME% >> %LOG_FILE%
echo ======================================== >> %LOG_FILE%

REM Run the Python processor and capture output
python "%%SCRIPT_DIR%%process_multi_agent_sessions.py" >> "%LOG_FILE%" 2>&1
set /p OUTPUT=<"%LOG_FILE%".tmp
if exist "%LOG_FILE%".tmp del "%LOG_FILE%".tmp

set END_TIME=%date% %time%

echo.
set /a NEW_COUNT=0
findstr /c:"New files processed:" "%LOG_FILE%" > nul 2>&1
if %errorlevel% equ 0 (
    set /a NEW_COUNT=%errorlevel%
    echo. >> %LOG_FILE%
    echo ======================================== >> %LOG_FILE%
    echo Processed %NEW_COUNT% files at %END_TIME% >> %LOG_FILE%
    echo ======================================== >> %LOG_FILE%
)

exit /b 0
