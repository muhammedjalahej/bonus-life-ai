@echo off
cd /d "%~dp0"
if not exist "insulyn-frontend" (
    echo Folder already renamed to bonus-life-ai-frontend. Nothing to do.
    pause
    exit /b 0
)
echo Renaming insulyn-frontend to bonus-life-ai-frontend...
ren "insulyn-frontend" "bonus-life-ai-frontend"
if %ERRORLEVEL% equ 0 (
    echo Done. You can reopen the project in Cursor.
) else (
    echo Failed. Close Cursor and any terminal using the folder, then run this again.
)
pause
