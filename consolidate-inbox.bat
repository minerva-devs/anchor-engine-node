@echo off
setlocal EnableDelayedExpansion

cd /d "C:\Users\rsbii\Projects\anchor-engine-node"

echo "=== Inbox Consolidation Script ==="
echo.

echo "1. Creating internal-inbox directory..."
if not exist "internal-inbox" (
    mkdir "internal-inbox"
    echo   Created internal-inbox directory
) else (
    echo   internal-inbox already exists
)

echo.
echo "2. Creating external-inbox directory..."
if not exist "external-inbox" (
    mkdir "external-inbox"
    echo   Created external-inbox directory
) else (
    echo   external-inbox already exists
)

echo.
echo "3. Moving files from inbox to internal-inbox..."
if exist "inbox" (
    for %%f in ("inbox\*") do (
        if exist "%%~f" (
            copy "%%~f" "internal-inbox\" 2>nul
            if errorlevel 1 (
                echo   Failed to copy: %%f
            ) else (
                echo   Copied: %%~nxf
            )
        )
    )
    rmdir /s /q inbox
    echo   Removed old inbox directory
) else (
    echo   No inbox directory found
)

echo.
echo "4. Listing new directory structure:"
dir /b "C:\Users\rsbii\Projects\anchor-engine-node" 2>nul | findstr /i "inbox"

echo.
echo "=== Consolidation Complete ==="
