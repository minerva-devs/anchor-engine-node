# Anchor Engine Installer for Windows

$ErrorActionPreference = "Stop"

Write-Host "⚓ Anchor Engine Installer (Windows)" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  pnpm not found. Installing..." -ForegroundColor Yellow
    npm install -g pnpm
}

$nodeVersion = (node -v).Substring(1, 2)
if ([int]$nodeVersion -lt 18) {
    Write-Host "❌ Node.js 18+ required. Found: $(node -v)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js $(node -v)" -ForegroundColor Green
Write-Host "✅ pnpm $(pnpm -v)" -ForegroundColor Green

# Get project root
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}
Set-Location $projectRoot

# Install and build
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

Write-Host ""
Write-Host "🔨 Building engine..." -ForegroundColor Yellow
pnpm build

Write-Host ""
Write-Host "▶️  Starting engine..." -ForegroundColor Yellow
Write-Host "    (This will keep running until Ctrl+C)..." -ForegroundColor Gray
pnpm start

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green