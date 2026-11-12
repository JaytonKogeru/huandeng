@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall-Huandeng.ps1" -RemoveApplication %*
if errorlevel 1 pause
