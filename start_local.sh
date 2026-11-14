#!/usr/bin/env bash
# Starts the full Back2U stack locally:
#   Backend API      http://localhost:8000   (FastAPI, src/api)
#   ML service       http://localhost:8001   (FastAPI, src/app)
#   Frontend         http://localhost:3000   (Next.js, frontend/)
# Press Ctrl+C to stop everything.
set -e
cd "$(dirname "$0")"

# --- Python environment ---
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi
source venv/bin/activate

# --- Frontend dependencies ---
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    (cd frontend && npm install)
fi

echo "Starting ML inference service (port 8001)... first start downloads pretrained models."
uvicorn src.app.main:app --host 127.0.0.1 --port 8001 &
ML_PID=$!

echo "Starting backend API (port 8000)..."
uvicorn src.api.main:app --host 127.0.0.1 --port 8000 &
API_PID=$!

echo "Starting frontend (port 3000)..."
(cd frontend && npm run dev) &
WEB_PID=$!

trap 'echo "Shutting down..."; kill $ML_PID $API_PID $WEB_PID 2>/dev/null; exit' INT TERM EXIT

echo "=========================================="
echo " Frontend:    http://localhost:3000"
echo " Backend API: http://localhost:8000/docs"
echo " ML service:  http://localhost:8001/api/health"
echo "=========================================="
wait
