@echo off
cd /d "%~dp0"
echo Starting Bonus Life AI backend (login, register, forgot-password, admin)
echo.
echo Backend will run on http://127.0.0.1:8001
echo Frontend is set to use 8001 (see app/frontend/insulyn-frontend/.env)
echo.
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
pause
