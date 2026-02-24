@echo off
REM Build script for Anchor Core C++ library (Windows)

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set BUILD_DIR=%SCRIPT_DIR%build

echo ========================================
echo Anchor Core - Build Script (Windows)
echo ========================================
echo.

REM Parse arguments
set BUILD_TYPE=Release
set BUILD_NAPI=OFF
set BUILD_TESTS=OFF

:parse_args
if "%~1"=="" goto :after_parse
if /i "%~1"=="--debug" (
    set BUILD_TYPE=Debug
    shift
    goto :parse_args
)
if /i "%~1"=="--with-napi" (
    set BUILD_NAPI=ON
    shift
    goto :parse_args
)
if /i "%~1"=="--with-tests" (
    set BUILD_TESTS=ON
    shift
    goto :parse_args
)
if /i "%~1"=="--clean" (
    echo Cleaning build directory...
    rmdir /s /q "%BUILD_DIR%"
    shift
    goto :parse_args
)
echo Unknown option: %~1
echo Usage: %~0 [--debug] [--with-napi] [--with-tests] [--clean]
exit /b 1

:after_parse

REM Create build directory
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
cd /d "%BUILD_DIR%"

REM Configure
echo.
echo Configuring CMake...
echo   Build Type: %BUILD_TYPE%
echo   N-API Bindings: %BUILD_NAPI%
echo   Tests: %BUILD_TESTS%
echo.

cmake .. ^
    -DCMAKE_BUILD_TYPE=%BUILD_TYPE% ^
    -DBUILD_NAPI_BINDINGS=%BUILD_NAPI% ^
    -DBUILD_TESTS=%BUILD_TESTS%

if errorlevel 1 (
    echo CMake configuration failed!
    exit /b 1
)

REM Build
echo.
echo Building...
cmake --build . --config %BUILD_TYPE%

if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Build artifacts located in: %BUILD_DIR%
echo.

if "%BUILD_NAPI%"=="ON" (
    echo N-API bindings copied to: %SCRIPT_DIR%..\engine\native\
)

endlocal
