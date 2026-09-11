@echo off
setlocal
cd /d "%~dp0"
start "ACADEMIA DUEL SERVER" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START-SERVER.ps1"
exit /b 0
