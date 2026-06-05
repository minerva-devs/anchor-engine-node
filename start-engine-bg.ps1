# start-engine-bg.ps1 - Start Anchor Engine in background (Windows)
# Usage: ./start-engine-bg.ps1
#
# Outputs:
#   - Starts engine via node engine/dist/index.js (captures stdout/stderr to log file)
#   - Polls http://localhost:3160/health until ready (~10s)
#   - Exits immediately after confirming health check passes

param(
    [string]$Port = "3160",
    [int]$MaxWaitSeconds = 30
)

$ErrorActionPreference = "Stop"

# Resolve paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = $ScriptDir
$LogFile = Join-Path $RootDir "engine-start.log"
$HealthUrl = "http://127.0.0.1:$Port/health"
$EnginePath = "$RootDir\engine\dist\index.js"

# Check if engine already running on port
$PortInUse = netstat -ano | Select-String "127.0.0.1:$Port " | Select-String "LISTENING"
if ($PortInUse) {
    $EnginePid = ($PortInUse | Select-Object -First 1) -split '\s+' | Where-Object { $_ -ne '' } | Select-Object -Last 1
    Write-Error "Engine already running on port $Port (PID: $EnginePid). Use stop-engine-bg.ps1 first."
    exit 1
}

# Verify engine build exists
if (-not (Test-Path $EnginePath)) {
    Write-Error "Engine not built. Run 'node scripts/build.ts' first."
    exit 1
}

# Start engine in background via node
Write-Host "Starting Anchor Engine in background..."
Write-Host "Log file: $LogFile"

# Use Start-Process to run node engine/dist/index.js in background, redirect output to file
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "node `"$EnginePath`" > `"$LogFile`" 2>&1" `
    -WindowStyle Hidden `
    -PassThru

# Poll health check
Write-Host "Waiting for engine to become healthy (max ${MaxWaitSeconds}s)..."
$StartTime = Get-Date
while ((Get-Date) -lt ($StartTime).AddSeconds($MaxWaitSeconds)) {
    try {
        $Response = Invoke-WebRequest -Uri $HealthUrl -Method GET -TimeoutSec 3
        if ($Response.StatusCode -eq 200) {
            Write-Host "Engine is healthy on http://localhost:$Port/ (took $(((Get-Date) - $StartTime).TotalSeconds.ToString('F1'))s)"
            Write-Host "Log file: $LogFile"
            Write-Host "To stop: .\stop-engine-bg.ps1"
            exit 0
        }
    }
    catch {
        # Health check not ready yet - check if process is still running
        $Proc = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -eq $null }
        if (-not $Proc) {
            Write-Error "Engine process exited. Check $LogFile for details."
            exit 1
        }
        Start-Sleep -Seconds 2
    }
}

Write-Error "Engine failed to start within ${MaxWaitSeconds}s. Check $LogFile for details."
exit 1
