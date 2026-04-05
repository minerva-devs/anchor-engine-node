@echo off
REM STAR Whitepaper Compilation Script
REM Run this 4 times for references to resolve

echo ========================================
echo STAR Whitepaper - Compilation Script
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1/4: First pdflatex pass...
pdflatex -interaction=nonstopmode star-whitepaper.tex
if errorlevel 1 (
    echo ERROR: First pdflatex pass failed!
    pause
    exit /b 1
)

echo.
echo Step 2/4: Running bibtex...
bibtex star-whitepaper
if errorlevel 1 (
    echo ERROR: BibTeX failed!
    pause
    exit /b 1
)

echo.
echo Step 3/4: Second pdflatex pass...
pdflatex -interaction=nonstopmode star-whitepaper.tex

echo.
echo Step 4/4: Third pdflatex pass (final)...
pdflatex -interaction=nonstopmode star-whitepaper.tex

echo.
echo ========================================
echo Compilation Complete!
echo ========================================
echo.
echo Output: star-whitepaper.pdf
echo.
echo If you see "Label(s) may have changed" warnings,
echo run this script one more time.
echo.

pause
