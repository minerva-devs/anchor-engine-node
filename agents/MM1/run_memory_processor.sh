#!/bin/bash
# Memory Manager Multi-Agent Session Processor
# Runs every morning and night to process all agent session logs

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/.memory_processor.log"
START_TIME=$(date "+%Y-%m-%d %H:%M:%S")

echo "=======================================" >> "$LOG_FILE"
echo "MEMORY MANAGER PROCESSOR - $START_TIME" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# Run the Python processor
python3 "${SCRIPT_DIR}/process_multi_agent_sessions.py" 2>&1 | tee -a "$LOG_FILE"

END_TIME=$(date "+%Y-%m-%d %H:%M:%S")
echo "" >> "$LOG_FILE"
echo "Completed at: $END_TIME" >> "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# Check if any files were processed (look for "New files processed:" in output)
if grep -q "New files processed:" <<< "$OUTPUT"; then
    NEW_COUNT=$(grep "New files processed:" <<< "$OUTPUT" | awk '{print $NF}')
    if [ "$NEW_COUNT" -gt 0 ] 2>/dev/null; then
        echo "✅ $NEW_COUNT files processed at $END_TIME" | tee -a "$LOG_FILE"
    fi
else
    echo "⚠️  No new files were processed at $END_TIME" | tee -a "$LOG_FILE"
fi
