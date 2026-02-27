#!/usr/bin/env pwsh
# Launch Jules AI session for PGlite migration
# 
# Usage: .\scripts\launch-jules-migration.ps1
#        .\scripts\launch-jules-migration.ps1 -Parallel 3

param(
    [int]$Parallel = 1
)

Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PGlite → SQLite3 Migration - Jules Launch                 ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\.."

# Read the migration task
$migrationTask = Get-Content "JULES-MIGRATION-TASK.md" -Raw

# Truncate if too long (Jules has token limits)
# Keep the most important parts
if ($migrationTask.Length -gt 8000) {
    Write-Host "⚠️  Task is long, truncating to fit Jules context..." -ForegroundColor Yellow
    $migrationTask = $migrationTask.Substring(0, 8000)
}

# Build the jules command
$julesCmd = "jules new"
if ($Parallel -gt 1) {
    $julesCmd += " --parallel $Parallel"
}

Write-Host "📋 Launching Jules with migration task..." -ForegroundColor Green
Write-Host "   Parallel sessions: $Parallel" -ForegroundColor Gray
Write-Host ""
Write-Host "Task preview (first 500 chars):" -ForegroundColor Gray
Write-Host "─" -ForegroundColor Gray
Write-Host $migrationTask.Substring(0, [Math]::Min(500, $migrationTask.Length)) -ForegroundColor Gray
Write-Host "..." -ForegroundColor Gray
Write-Host ""

# Launch Jules
Write-Host "🚀 Starting Jules session(s)..." -ForegroundColor Green
Write-Host ""

# Use piped input
$migrationTask | Invoke-Expression "$julesCmd"

Write-Host ""
Write-Host "✅ Jules session(s) launched!" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor progress:" -ForegroundColor Cyan
Write-Host "  jules remote list --session" -ForegroundColor Gray
Write-Host ""
Write-Host "Pull results when complete:" -ForegroundColor Cyan
Write-Host "  jules remote pull --session <SESSION_ID>" -ForegroundColor Gray
Write-Host ""
