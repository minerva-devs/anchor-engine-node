@echo off
cd /d "%~dp0"
node --expose-gc engine/dist/index.js
