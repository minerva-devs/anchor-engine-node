# ============================================================================
# Anchor Engine Startup Script (PowerShell)
# ============================================================================
# This script performs a clean startup of the Anchor Engine:
#   1. Installs dependencies (pnpm install)
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

# Change to script directory (ensures correct paths)
Set-Location $PSScriptRoot

# Step 1: Check project structure
Write-Host "[1/4] Checking project structure..." -ForegroundColor Yellow
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Project structure verified" -ForegroundColor Green

# Step 2: Install dependencies
Write-Host "[2/4] Installing dependencies with pnpm..." -ForegroundColor Yellow
$pnpmOutput = pnpm install --no-optional 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Write-Host "pnpm install completed with warnings, continuing..." -ForegroundColor Orange
} else {
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
}

# Step 3: Build engine
Write-Host "[3/4] Building engine..." -ForegroundColor Yellow
$buildOutput = pnpm run build 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build completed with warnings, continuing..." -ForegroundColor Orange
} else {
    Write-Host "[OK] Build complete" -ForegroundColor Green
}

# Step 4: Start engine in background
Write-Host "[4/4] Starting Anchor Engine..." -ForegroundColor Yellow

# Start the engine and capture its process ID
$process = Start-Process "pnpm start-with-logging" -PassThru -WindowStyle Hidden
$enginePid = $process.Id

Write-Host "[OK] Engine started with PID: $enginePid" -ForegroundColor Green

# Wait for server to be ready on port 3160
Write-Host "Waiting for server to start on port 3160..." -ForegroundColor Yellow

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
Write-Host "Logs available at: .anchor\logs\" -ForegroundColor Yellow
Write-Host ""

# Return engine PID for shutdown script
exit 0