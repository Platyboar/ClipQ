@echo off
setlocal
set "PYTHONDONTWRITEBYTECODE=1"
if exist "C:\Program Files\nodejs" set "PATH=C:\Program Files\nodejs;%PATH%"

set "DO_PAUSE=1"
set "PY_ARGS="
for %%A in (%*) do (
    if /I "%%~A"=="--no-pause" (
        set "DO_PAUSE=0"
    ) else (
        call set "PY_ARGS=%%PY_ARGS%% %%A"
    )
)

python -B "%~dp0tests\check_all.py" %PY_ARGS%
set "EXIT_CODE=%ERRORLEVEL%"

if "%DO_PAUSE%"=="1" (
    echo.
    pause
)
exit /b %EXIT_CODE%
