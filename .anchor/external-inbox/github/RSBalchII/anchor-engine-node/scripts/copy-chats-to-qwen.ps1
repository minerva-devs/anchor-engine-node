#!/usr/bin/env pwsh

# Copy chats from Coding-Notes to .qwen/chats without duplicating
# Preserves the directory structure (qwen, gemini-cli, copilot-cli, vscode)

$sourceBase = "C:\Users\rsbiiw\Projects\Coding-Notes\inbox\chats\chat-exports"
$destBase = "C:\Users\rsbiiw\.qwen\chats"

# Get all subdirectories (qwen, gemini-cli, copilot-cli, vscode)
$subdirs = Get-ChildItem -Path $sourceBase -Directory

$totalCopied = 0
$totalSkipped = 0

foreach ($subdir in $subdirs) {
    $sourceDir = $subdir.FullName
    $destDir = Join-Path $destBase $subdir.Name
    
    # Create destination directory if it doesn't exist
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Write-Host "Created: $destDir"
    }
    
    # Get all .md files in source
    $files = Get-ChildItem -Path $sourceDir -File -Filter "*.md"
    
    foreach ($file in $files) {
        $destFile = Join-Path $destDir $file.Name
        
        # Check if file already exists (avoid duplicates)
        if (Test-Path $destFile) {
            Write-Host "  Skip (exists): $($file.Name)" -ForegroundColor Yellow
            $totalSkipped++
        } else {
            Copy-Item -Path $file.FullName -Destination $destFile
            Write-Host "  Copied: $($file.Name)" -ForegroundColor Green
            $totalCopied++
        }
    }
}

Write-Host "`n========================================"
Write-Host "Summary:"
Write-Host "  Copied: $totalCopied files"
Write-Host "  Skipped: $totalSkipped files (already exist)"
Write-Host "  Destination: $destBase"
Write-Host "========================================"
