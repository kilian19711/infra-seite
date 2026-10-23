@echo off
rem Keeps the website server running: if node exits (crash or the nightly 2:00 restart), it starts again after 5 s.
cd /d "%~dp0"
if not exist logs mkdir logs
:loop
node server.mjs >nul 2>> logs\crash.log
timeout /t 5 /nobreak >nul
goto loop
