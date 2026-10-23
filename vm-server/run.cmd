@echo off
rem Keeps the website server running: if node exits (crash or the nightly 2:00 restart), it starts again after 5 s.
cd /d "%~dp0"
if not exist logs mkdir logs
:loop
node server.mjs >> logs\server.log 2>&1
timeout /t 5 /nobreak >nul
goto loop
