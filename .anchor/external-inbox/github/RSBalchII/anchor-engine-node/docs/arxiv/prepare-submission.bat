@echo off
REM Prepare arXiv Submission Package
REM Creates a clean zip file with only necessary files

echo ========================================
echo Preparing arXiv Submission Package
echo ========================================
echo.

cd /d "%~dp0"

REM Create submission directory
set SUBMISSION_DIR=star-arxiv-submission
if exist "%SUBMISSION_DIR%" (
    echo Cleaning up old submission directory...
    rmdir /s /q "%SUBMISSION_DIR%"
)

echo Creating submission directory...
mkdir "%SUBMISSION_DIR%"

echo.
echo Copying files...
copy star-whitepaper.tex "%SUBMISSION_DIR%\"
copy BIBLIOGRAPHY.bib "%SUBMISSION_DIR%\"
copy star-whitepaper.pdf "%SUBMISSION_DIR%\" 2>nul

echo.
echo ========================================
echo Submission Package Ready!
echo ========================================
echo.
echo Files in %SUBMISSION_DIR%:
dir /b "%SUBMISSION_DIR%"
echo.
echo Next steps:
echo 1. Upload %SUBMISSION_DIR% contents to arxiv.org/submit
echo 2. Metadata:
echo    - Title: STAR: Semantic Temporal Associative Retrieval
echo    - Authors: R.S. Balch II
echo    - Categories: cs.IR (primary), cs.AI (secondary)
echo    - Comments: 28M token production deployment; 10 pages; 5 figures
echo    - Keywords: Information Retrieval, Graph-Based Search, Local-First AI
echo.

pause
