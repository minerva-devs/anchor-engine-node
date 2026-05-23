# Cleanup Script for Anchor Engine Project Root
# Run as: powershell -ExecutionPolicy Bypass -File clean-root.ps1

$projectRoot = "C:\Users\rsbii\Projects\anchor-engine-node"

Write-Host "🔧 Anchor Engine Root Cleanup" -ForegroundColor Cyan
Write-Host "=".PadRight(60, "=")
Write-Host "Project Root: $projectRoot"
Write-Host ""

# ============================================
# SECTION 1: Delete Runtime Directories
# ============================================
$runtimeDirs = @(
    "backup",
    "dialog",
    "embedding_cache",
    "file_store",
    "logs",
    "media",
    "notebook",
    "sessions",
    "test_minimal_db",
    "user_data",
    "benchmarks",
    "distillation-v2-temp",
    "engines",
    "orchestration",
    "reports"
)

Write-Host "🗑️  DELETING RUNTIME DIRECTORIES..." -ForegroundColor Yellow
foreach ($dir in $runtimeDirs) {
    $path = Join-Path $projectRoot $dir
    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Deleted: $dir/" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Error deleting $dir/: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  ℹ️  $dir/ doesn't exist" -ForegroundColor Gray
    }
}

# ============================================
# SECTION 2: Delete Empty Runtime Directories
# ============================================
$emptyDirs = @(
    ".anchor",
    "tool_result",
    "tool_results"
)

Write-Host ""
Write-Host "🗑️  CLEANNING EMPTY DIRECTORIES..." -ForegroundColor Yellow
foreach ($dir in $emptyDirs) {
    $path = Join-Path $projectRoot $dir
    if (Test-Path $path) {
        try {
            if ((Get-ChildItem -Path $path -ErrorAction SilentlyContinue).Count -eq 0) {
                Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  ✅ Deleted empty: $dir/" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ❌ Error: $_" -ForegroundColor Red
        }
    }
}

# ============================================
# SECTION 3: Delete Temporary/Debug Files
# ============================================
$tempFiles = @(
    "$null",
    "0",
    "filename.endsWith(ext))",
    ".temp-report-gen.js",
    ".temp-write-report.js",
    "test.txt",
    "temp.txt"
)

Write-Host ""
Write-Host "🗑️  DELETING TEMP/DEBUG FILES..." -ForegroundColor Yellow
foreach ($file in $tempFiles) {
    $path = Join-Path $projectRoot $file
    if (Test-Path $path) {
        try {
            Remove-Item -Path $path -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Deleted: $file" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Error deleting $file: $_" -ForegroundColor Red
        }
    }
}

# ============================================
# SECTION 4: Handle System JSON Files
# ============================================
$systemFiles = @(
    "system_config.json",
    "system_files.json",
    "system_ingest_status.json",
    "system_memory.json",
    "system_paths.json",
    "system_paths2.json",
    "system_status.json",
    "ingest-payload.json",
    "ingestion-response.json",
    "ingest_status.json",
    "compounds-table.json",
    "deep-search.json",
    "illuminate-search.json",
    "exact-search.json",
    "star-search-nostream.json",
    "atoms.json",
    "chats.json",
    "jobs.json"
)

Write-Host ""
Write-Host "📄 REVIEWING SYSTEM JSON FILES..." -ForegroundColor Yellow
foreach ($file in $systemFiles) {
    $path = Join-Path $projectRoot $file
    if (Test-Path $path) {
        $size = (Get-Item $path).Length / 1KB
        Write-Host "  📄 $file ($([math]::Round($size, 1)) KB) - DELETE?" -ForegroundColor Yellow
    }
}

# ============================================
# SECTION 5: Handle QwenPaw Files
# ============================================
$scriptPath = Join-Path $projectRoot "mcp-server"
if (Test-Path $scriptPath) {
    Write-Host ""
    Write-Host "🤖 MCP-SERVER SERVICE DIRECTORY..." -ForegroundColor Yellow
    $contents = Get-ChildItem -Path $scriptPath -ErrorAction SilentlyContinue
    if ($contents.Count -gt 0) {
        Write-Host "  📦 mcp-server/ contains $($contents.Count) items"
        Write-Host "  ℹ️  This is a QwenPaw service - KEEP in project root" -ForegroundColor Cyan
        Write-Host "  ℹ️  Add to .gitignore if you don't want to track it" -ForegroundColor Cyan
    }
}

$projectPath = Join-Path $projectRoot ".qwen"
if (Test-Path $projectPath) {
    Write-Host ""
    Write-Host "🤖 QWENPAW SESSION DATA (.qwen/)..." -ForegroundColor Yellow
    Write-Host "  ℹ️  This contains Qwen Code session data - DELETE if not needed" -ForegroundColor Cyan
}

$clinePath = Join-Path $projectRoot ".cline"
if (Test-Path $clinePath) {
    Write-Host ""
    Write-Host "🤖 CLINE DATA (.cline/)..." -ForegroundColor Yellow
    Write-Host "  ℹ️  This contains Cline IDE data - DELETE if not needed" -ForegroundColor Cyan
}

# ============================================
# SECTION 6: Handle Migration Artifacts
# ============================================
$migrationFiles = @(
    ".PROJECT_ASSESSMENT.md",
    "TEST_ASSESSMENT.md"
)

Write-Host ""
Write-Host "📝 REVIEWING MIGRATION ARTIFACTS..." -ForegroundColor Yellow
foreach ($file in $migrationFiles) {
    $path = Join-Path $projectRoot $file
    if (Test-Path $path) {
        $size = (Get-Item $path).Length / 1KB
        Write-Host "  📄 $file ($([math]::Round($size, 1)) KB) - DELETE?" -ForegroundColor Yellow
        Write-Host "  ℹ️  These are old migration assessments - DELETE" -ForegroundColor Cyan
    }
}

# ============================================
# SECTION 7: Check What Remains in Project Root
# ============================================
Write-Host ""
Write-Host "📊 SUMMARY - FILES/DIRS IN PROJECT ROOT" -ForegroundColor Cyan
Write-Host "=".PadRight(60, "=")

$allowedRootFiles = @(
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    ".gitignore",
    ".dockerignore",
    ".npmignore",
    ".bootstrap_completed",
    ".zenodo.json",
    "paper.bib",
    "CITATION.cff",
    "cross-platform-setup.md"
)

$allowedRootDirs = @(
    "engine",
    "tests",
    "scripts",
    "docs",
    "sample-data",
    "browser",
    "mcp-server",
    "node_modules"
)

Write-Host ""
Write-Host "📄 FILES:" -ForegroundColor Cyan
$rootFiles = Get-ChildItem -Path $projectRoot -File -ErrorAction SilentlyContinue | Select-Object Name
foreach ($file in $rootFiles) {
    $name = $file.Name
    if ($allowedRootFiles.Contains($name) -or $allowedRootDirs.Contains($name)) {
        Write-Host "  ✅ $name - OK" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $name - SHOULD BE DELETED OR MOVED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📁 DIRECTORIES:" -ForegroundColor Cyan
$rootDirs = Get-ChildItem -Path $projectRoot -Directory -ErrorAction SilentlyContinue | Select-Object Name
foreach ($dir in $rootDirs) {
    $name = $dir.Name
    if ($allowedRootDirs.Contains($name)) {
        Write-Host "  ✅ $name/ - OK" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $name/ - SHOULD BE DELETED OR MOVED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ CLEANUP COMPLETE" -ForegroundColor Cyan
Write-Host "=".PadRight(60, "=")
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review the summary above" -ForegroundColor White
Write-Host "  2. Delete files marked with ❌" -ForegroundColor White
Write-Host "  3. Move allowed files to appropriate locations (docs/, specs/)" -ForegroundColor White
Write-Host "  4. Run 'git status' to see what changed" -ForegroundColor White
