@echo off
cd /d "%~dp0"
echo Updating yt-dlp...
python -m pip install --upgrade yt-dlp
if %errorlevel% equ 0 (
    echo yt-dlp update completed.
) else (
    echo yt-dlp update failed.
)
pause
