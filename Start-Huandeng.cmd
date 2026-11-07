@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Open-Huandeng.ps1" %*
if errorlevel 1 pause
