@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0engine"

if exist dist (
    rmdir /s /q dist
)

call npx tsc

if %ERRORLEVEL% EQU 0 (
    echo Build complete successfully
) else (
    echo Build failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
