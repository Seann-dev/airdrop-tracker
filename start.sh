#!/bin/bash
cd /home/hatch/airdrop-tracker/backend
source /home/hatch/airdrop-tracker/venv/bin/activate
export PYTHONPATH=.
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd /home/hatch/airdrop-tracker/frontend
npm run dev -- --host &
FRONTEND_PID=$!

echo "Airdrop Tracker AI Started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"

wait $BACKEND_PID $FRONTEND_PID
