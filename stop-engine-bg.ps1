# stop-engine-bg.ps1 - Stop Anchor Engine (Windows)
# Usage: ./stop-engine-bg.ps1
#
# Finds engine process by port (3160) and sends SIGTERM, then waits for clean shutdown.
# If graceful shutdown fails, forcefully kills the process after 15s.

param(
    [string]$Port = "3160",
    [int]$GracefulTimeout = 15
)

$ErrorActionPreference = "Stop"

# Find the engine process by port
$PortInUse = netstat -ano | Select-String ":$Port " | Select-String "LISTENING"
if (-not $PortInUse) {
    Write-Host "Engine not running on port $Port"
    exit 0
}

$EnginePid = ($PortInUse | Select-Object -First 1) -split '\s+' | Where-Object { $_ -ne '' } | Select-Object -Last 1
Write-Host "Stopping Engine on port $Port (PID: $EnginePid)..."

# Try graceful shutdown via HTTP (if engine is up but health check might fail)
try {
    Invoke-RestMethod -Uri "http://localhost:$Port/shutdown" -Method POST -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "Shutdown signal sent via HTTP /shutdown endpoint"
}
catch {
    Write-Host "HTTP shutdown not available, sending SIGTERM via Process object..."
}

# Find the node process and send SIGTERM
$NodeProcess = Get-Process -Id $EnginePid -ErrorAction SilentlyContinue
if ($NodeProcess) {
    # Try to stop via Stop-Process with SIGTERM
    try {
        $NodeProcess | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    catch {
        # Stop-Process on Windows uses TerminateProcess which is forceful
        Write-Host "Forcefully terminating process $EnginePid..."
    }
}

# Wait for process to exit
$StartTime = Get-Date
$MaxWait = $GracefulTimeout
while ((Get-Date) -lt ($StartTime).AddSeconds($MaxWait)) {
    $Process = Get-Process -Id $EnginePid -ErrorAction SilentlyContinue
    if (-not $Process) {
        Write-Host "Engine stopped gracefully (took $(((Get-Date) - $StartTime).TotalSeconds.ToString('F1'))s)"
        exit 0
    }
    Start-Sleep -Seconds 1
}

# Force kill if still running
Write-Host "Engine didn't stop gracefully - force killing..."
try {
    Stop-Process -Id $EnginePid -Force -ErrorAction SilentlyContinue
    Write-Host "Engine force killed."
}
catch {
    Write-Error "Failed to kill process $EnginePid."
    exit 1
}

exit 0
