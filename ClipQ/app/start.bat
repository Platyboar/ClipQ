@echo off
if not "%1" == "min" (
    start /min cmd /c "%~f0" min
    exit
)
echo Starting ClipQ...
cd /d "%~dp0"
start http://localhost:8000
python server.py
