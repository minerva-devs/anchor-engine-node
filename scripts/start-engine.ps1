# ============================================================================
# Anchor Engine Startup Script
# ============================================================================

$ErrorActionPreference = 'Continue'

Write-Host "============================================"
Write-Host "Anchor Engine Startup"
Write-Host "============================================"

# Change to project directory
Set-Location -LiteralPath $PSScriptRoot..

# Check if project directory exists
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "[2/4] Installing dependencies with pnpm..." -ForegroundColor Cyan
try {
    & "C:\Users\rsbii\.pnpm\bin\pnpm.ps1" install --no-optional --reporter=silent
} catch {
    Write-Host "WARN: pnpm install completed with warnings" -ForegroundColor Yellow
}

# Build engine
Write-Host "[3/4] Building engine..." -ForegroundColor Cyan
try {
    & "C:\Users\rsbii\.pnpm\bin\pnpm.ps1" run build
} catch {
    Write-Host "WARN: Build completed with warnings" -ForegroundColor Yellow
}

# Start engine in background
Write-Host "[4/4] Starting Anchor Engine..." -ForegroundColor Cyan
$engineProcess = Start-Process -FilePath "C:\Users\rsbii\.pnpm\bin\pnpm.ps1" -ArgumentList "start-with-logging" -WindowStyle Hidden -PassThru
$engineId = $engineProcess.Id

Write-Host "[INFO] Engine PID: $engineId" -ForegroundColor Green
Write-Host "[INFO] Server should be available at http://localhost:3160" -ForegroundColor Green
Write-Host "[INFO] Logs at: .anchor\logs\" -ForegroundColor Green

# Wait for server to be ready
Write-Host "[INFO] Waiting for server to be ready..." -ForegroundColor Cyan
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3160/health" -Method Get -ErrorAction Stop -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "[INFO] Server is ready at http://localhost:3160" -ForegroundColor Green
            exit 0
        }
    } catch {
        if ($i -lt 29) { Start-Sleep -Seconds 2 }
    }
}

Write-Host "[ERROR] Server did not start within 60 seconds" -ForegroundColor Red
exit 1