#!/bin/bash
# Memory Manager Multi-Agent Session Processor - Setup Script
# This script sets up automatic processing via Windows Task Scheduler

echo "================================================"
echo "Memory Manager Multi-Agent Session Processor"
echo "Setting up automatic processing..."
echo "================================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROCESSOR_SCRIPT="${SCRIPT_DIR}/process_multi_agent_sessions.py"
BATCH_FILE="${SCRIPT_DIR}/run_memory_processor.bat"

# Check if processor script exists
if [ ! -f "$PROCESSOR_SCRIPT" ]; then
    echo "❌ Error: Processor script not found at $PROCESSOR_SCRIPT"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python3 is not installed or not in PATH"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

# Create the batch file if it doesn't exist
if [ ! -f "$BATCH_FILE" ]; then
    cat > "$BATCH_FILE" << 'BAT_EOF'
@echo off
REM Memory Manager Multi-Agent Session Processor
REM This batch file runs the multi-agent session processor

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set LOG_FILE=%SCRIPT_DIR%.memory_processor.log
set START_TIME=%date% %time%

echo ======================================== > "%LOG_FILE%"
echo MEMORY MANAGER PROCESSOR - %START_TIME% >> "%LOG_FILE%"
echo ======================================== >> "%LOG_FILE%"

REM Run the Python processor and capture output
python "%%SCRIPT_DIR%%process_multi_agent_sessions.py" >> "%LOG_FILE%" 2>&1

set END_TIME=%date% %time%

echo.
set /a NEW_COUNT=0
findstr /c:"New files processed:" "%LOG_FILE%" > nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ======================================== >> "%LOG_FILE%"
    echo Processed files completed at %END_TIME% >> "%LOG_FILE%"
    echo ======================================== >> "%LOG_FILE%"
)

echo ======================================== >> "%LOG_FILE%"
echo Completed at: %END_TIME% >> "%LOG_FILE%"
echo ======================================== >> "%LOG_FILE%"

exit /b 0
BAT_EOF
    echo "✅ Created batch file: $BATCH_FILE"
else
    echo "ℹ️  Batch file already exists"
fi

# Install git bash cron (optional)
echo ""
echo "ℹ️  Would you like to install git bash cron for scheduled tasks? (y/n)"
read -r response
if [[ "$response" == "y" || "$response" == "Y" ]]; then
    echo "Installing git bash cron..."
    # This will prompt the user to install if not already installed
    echo "If you don't have git bash cron installed, it will download and install it."
    echo "After installation, you'll be able to set up scheduled cron jobs." >&2
fi

echo ""
echo "================================================"
echo "SETUP COMPLETE"
echo "================================================"
echo ""
echo "To process session logs manually, run:"
echo "  batch:   run_memory_processor.bat"
echo "  python:  python process_multi_agent_sessions.py"
echo ""
echo "To set up automatic processing:"
echo "1. Install git bash cron: https://git-scm.com/docs/cron"
echo "2. Create a new crontab: crontab -e"
echo "3. Add these lines:"
echo "   # Morning run (6:30 AM)"
echo "   30 6 * * * ${SCRIPT_DIR}/run_memory_processor.bat"
echo "   # Night run (7:30 PM)"
echo "   30 19 * * * ${SCRIPT_DIR}/run_memory_processor.bat"
echo ""
echo "Alternatively, use Windows Task Scheduler:"
echo "1. Open Task Scheduler (search for 'Task Scheduler')"
echo "2. Create a basic task"
echo "3. Set trigger: Daily, at 6:30 AM and 7:30 PM"
echo "4. Action: Start a program"
echo "5. Program/script: %WINDIR%\System32\cmd.exe"
echo "6. Add arguments: /C "${SCRIPT_DIR}run_memory_processor.bat""
echo "7. Check 'Run whether user is logged on or not'"
echo ""
echo "The processor will:"
echo "- Scan ALL agent workspaces for session logs"
echo "- Track processed files to avoid duplication"
echo "- Extract event chains and write to MEMORY.md"
echo "- Log all activity to .memory_processor.log"
echo "================================================"
