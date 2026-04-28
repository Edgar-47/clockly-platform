@echo off
start "ClockLy Backend" powershell -NoExit -Command "cd '%~dp0backend_v2'; python -m alembic upgrade head; python -m uvicorn app.main:app --reload --port 8010"
start "ClockLy Frontend" powershell -NoExit -Command "cd '%~dp0frontend-next'; npm run dev"
