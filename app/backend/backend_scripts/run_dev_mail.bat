@echo off
cd /d "%~dp0.."
echo Starting dev mail server on port 1025.
echo Forgot-password emails will appear here and in backend_scripts\mail_output folder.
echo Keep this window open; then run run_backend.bat in another window.
echo.
python backend_scripts\dev_mail_server.py
pause
