@echo off
if not "%1" == "min" (
    start /min cmd /c "%~f0" min
    exit
)
echo Checking prerequisites...

:: Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Python is not installed! Installing Python 3.12...
    goto install_python
)

:: Check if Python version is >= 3.8
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>nul
if %errorlevel% neq 0 (
    echo Python version is older than 3.8! Upgrading to Python 3.12...
    goto install_python
)

echo Python version check passed.
goto start_server

:install_python
echo Downloading Python 3.12 installer...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url = 'https://www.python.org/ftp/python/3.12.3/python-3.12.3-amd64.exe'; $out = '$env:TEMP\python_installer.exe'; (New-Object System.Net.WebClient).DownloadFile($url, $out); echo 'Installing Python 3.12 (quiet mode)...'; Start-Process -FilePath $out -ArgumentList '/quiet PrependPath=1 Include_test=0 Include_doc=0' -Wait"
if %errorlevel% neq 0 (
    echo Python installation failed! Please install Python 3.8+ manually.
    pause
    exit
)
echo Python was successfully installed.
echo Please restart this start.bat script to apply environment changes!
pause
exit

:start_server
echo Starting ClipQ...
cd /d "%~dp0"
python server.py
