# Memory Manager Multi-Agent Session Processor
# PowerShell script for Windows Task Scheduler

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logFile = Join-Path $scriptDir ".memory_processor.log"
$startTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "MEMORY MANAGER PROCESSOR - $startTime" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan | Tee-Object -Path $logFile

try {
    # Run the Python processor
    & python "$(Join-Path $scriptDir process_multi_agent_sessions.py)" 2>&1 | Tee-Object -Append -FilePath $logFile
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    $errorMessage = $_.Exception.Message
    $errorMessage | Out-File -Append -FilePath $logFile
}

$endTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "" >> $logFile
Write-Host "=======================================" >> $logFile
Write-Host "Completed at: $endTime" >> $logFile
Write-Host "=======================================" >> $logFile

exit 0
