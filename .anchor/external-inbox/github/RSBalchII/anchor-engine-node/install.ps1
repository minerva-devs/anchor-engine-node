# Anchor Engine One-Shot Installer for Windows
# Run with: PowerShell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

Write-Host "⚓ Anchor Engine Installer (Windows)" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

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
Write-Host ""

# Get project root
$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}
Set-Location $projectRoot

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

Write-Host ""
Write-Host "🔨 Building engine..." -ForegroundColor Yellow
pnpm build:all

Write-Host ""
Write-Host "📁 Creating required directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "notebook\inbox" | Out-Null
New-Item -ItemType Directory -Force -Path "notebook\external-inbox" | Out-Null
New-Item -ItemType Directory -Force -Path ".anchor\mirrored_brain" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
New-Item -ItemType Directory -Force -Path "engine\context_data" | Out-Null

Write-Host ""
Write-Host "⚙️  Setting up configuration..." -ForegroundColor Yellow

# Create user_settings.json if it doesn't exist
if (-not (Test-Path "user_settings.json")) {
    $settings = @{
        server = @{
            host = "0.0.0.0"
            port = 3160
            api_key = "bolt-memory-secret"
        }
        encryption = @{
            enabled = $false
            password_storage = "env"
            password_env_var = "ANCHOR_MASTER_PASSWORD"
            min_confidence = 0.7
            auto_encrypt_on_ingest = $true
            auto_decrypt_on_search = $true
            detect_nsfw = $false
            dry_run = $false
        }
        search = @{
            strategy = "hybrid"
            hide_years_in_tags = $true
            whitelist = @()
            max_chars_default = 524288
            max_chars_limit = 20000
        }
        watcher = @{
            debounce_ms = 2000
            stability_threshold_ms = 2000
            extra_paths = @()
        }
        database = @{
            wipe_on_startup = $false
        }
        memory = @{
            throttle_start_mb = 1500
            throttle_max_mb = 2500
            emergency_stop_mb = 3500
        }
        mcp = @{
            enabled = $true
            rate_limit_requests_per_minute = 60
            max_query_results = 50
            allowed_operations = @("query", "read_file", "get_stats", "distill", "illuminate", "list", "ingest_text", "ingest_file", "github_ingest", "watchdog")
            blocked_operations = @()
            allow_write_operations = $true
            default_bucket_for_writes = "external-inbox"
        }
    }
    
    $settings | ConvertTo-Json -Depth 10 | Set-Content "user_settings.json"
    Write-Host "✅ Created user_settings.json" -ForegroundColor Green
} else {
    Write-Host "✅ user_settings.json already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔍 Running health check..." -ForegroundColor Yellow

# Start engine in background
Write-Host "Starting engine for health check..."
$engineProcess = Start-Process -FilePath "node" -ArgumentList "engine/dist/index.js" -RedirectStandardOutput "logs/anchor-engine.log" -RedirectStandardError "logs/anchor-engine.log" -PassThru -WindowStyle Hidden

# Wait for startup
Start-Sleep -Seconds 8

# Check health
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3160/health" -Method GET -ErrorAction Stop
    if ($health.status -eq "healthy") {
        Write-Host "✅ Engine is healthy" -ForegroundColor Green
        Write-Host "✅ API: http://localhost:3160" -ForegroundColor Green
        Write-Host "✅ Health: http://localhost:3160/health" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Engine health check returned: $($health.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Engine health check failed" -ForegroundColor Yellow
    Write-Host "Check logs: Get-Content logs/anchor-engine.log -Tail 20" -ForegroundColor Yellow
}

# Stop the test instance
Stop-Process -Id $engineProcess.Id -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "⚓ Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host ""
Write-Host "1. Start the engine:" -ForegroundColor White
Write-Host "   pnpm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Open the UI:" -ForegroundColor White
Write-Host "   http://localhost:3160" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Add watch paths in Settings UI:" -ForegroundColor White
Write-Host "   - Click 'Manage Paths'" -ForegroundColor Gray
Write-Host "   - Add your chat/notebook directories" -ForegroundColor Gray
Write-Host "   - Start watchdog when ready" -ForegroundColor Gray
Write-Host ""
Write-Host "4. For LLM integration (MCP):" -ForegroundColor White
Write-Host "   - MCP Server: mcp-server/dist/index.js" -ForegroundColor Gray
Write-Host "   - Tools: anchor_query, anchor_distill, anchor_watchdog_start, etc." -ForegroundColor Gray
Write-Host ""
Write-Host "Default directories created:" -ForegroundColor White
Write-Host "   - notebook/inbox/ (your content)" -ForegroundColor Gray
Write-Host "   - notebook/external-inbox/ (external imports)" -ForegroundColor Gray
Write-Host "   - .anchor/mirrored_brain/ (derived data)" -ForegroundColor Gray
Write-Host ""
Write-Host "Logs: Get-Content logs/anchor-engine.log -Wait" -ForegroundColor Gray
Write-Host ""
