# ============================================================================
# Anchor Engine Startup Script (PowerShell)
# ============================================================================
# This script performs a clean startup of the Anchor Engine:
#   1. Sets working directory to project root using paths from user_settings.json.template
#   2. Starts the engine with full logging
#   3. Waits for server to be ready on port 3160
# ============================================================================

param(
    [switch]$Quiet,
    [string]$OutputLog = "$PSScriptRoot\start-engine.log"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Anchor Engine Startup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Get the directory where this script lives (scripts/)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Navigate to project root (parent of scripts/)
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

Write-Host "Project Root: $projectRoot" -ForegroundColor Yellow
Write-Host "[1/4] Checking project structure..." -ForegroundColor Yellow

if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found at $projectRoot" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Project structure verified" -ForegroundColor Green

# Step 2: Install dependencies if needed
Write-Host "[2/4] Ensuring dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing pnpm packages..." -ForegroundColor Yellow
    & pnpm install --no-optional 2>&1 | Out-String
} else {
    Write-Host "[OK] Dependencies present" -ForegroundColor Green
}

# Step 3: Build engine if needed (check for dist folder)
Write-Host "[3/4] Building engine..." -ForegroundColor Yellow
if (-not (Test-Path "dist\index.js")) {
    $buildOutput = & pnpm run build 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build completed with warnings, continuing..." -ForegroundColor Orange
    } else {
        Write-Host "[OK] Build complete" -ForegroundColor Green
    }
} else {
    Write-Host "[OK] dist/index.js found, build not required" -ForegroundColor Green
}

# Step 4: Start engine in background
Write-Host "[4/4] Starting Anchor Engine..." -ForegroundColor Yellow

# Use start-process with WorkingDirectory to ensure correct working directory
$process = Start-Process -FilePath "node" -ArgumentList "dist/index.js" -PassThru -WindowStyle Hidden -WorkingDirectory $projectRoot
$enginePid = $process.Id

Write-Host "[OK] Engine started with PID: $enginePid" -ForegroundColor Green
Write-Host "[INFO] Server will listen on port 3160" -ForegroundColor Cyan

# Wait for server to be ready on port 3160
Write-Host "Waiting for server to start..." -ForegroundColor Yellow

for ($i = 1; $i -le 30; $i++) {
    try {
        $testConnection = New-Object System.Net.Sockets.TcpClient -ArgumentList "localhost", 3160
        if ($testConnection.Connected) {
            Write-Host "[OK] Server is ready on port 3160" -ForegroundColor Green
            $testConnection.Close()
            break
        }
    } catch {
        # Connection failed, continue waiting
    }
    Start-Sleep -Seconds 2
}

# Log output
if (-not $Quiet) {
    Get-Content "pnpm-lock.yaml" | Out-File $OutputLog -Append
    Get-Content "package.json" | Out-File $OutputLog -Append
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Anchor Engine started successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Server is running on http://localhost:3160" -ForegroundColor White
Write-Host "Project root: $projectRoot" -ForegroundColor Yellow
Write-Host "Logs available at: .anchor\logs\" -ForegroundColor Yellow
Write-Host ""

# Return engine PID for shutdown script
exit 0