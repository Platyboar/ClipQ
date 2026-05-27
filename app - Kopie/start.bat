@echo off
echo Starting ClipQ...
cd /d "%~dp0"
start http://localhost:8000
python server.py
pause
