#!/bin/bash

# Ensure virtual environment exists and is activated
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment 'venv' not found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

echo "Starting Backend API (Port 8000)..."
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

echo "Starting ML Inference Service (Port 8001)..."
uvicorn src.app.main:app --host 0.0.0.0 --port 8001 --reload &
ML_PID=$!

echo "Starting Classic Frontend Fallback (Port 3001)..."
cd frontend
npm install
npm run dev &
CLASSIC_PID=$!
cd ..

echo "Starting UI Lab Primary Frontend (Port 3000)..."
cd back2u-ui-lab
npm install
npm run dev &
LAB_PID=$!
cd ..

echo "=========================================="
echo "All services are starting up!"
echo "Backend API: http://localhost:8000"
echo "ML Service: http://localhost:8001"
echo "UI Lab Frontend (Primary): http://localhost:3000"
echo "Classic Frontend (Fallback): http://localhost:3001"
echo "=========================================="
echo "Running in background... (Logs will be printed here)"

# Trap termination signals to kill all child processes
trap "echo 'Shutting down services...'; kill $API_PID $ML_PID $CLASSIC_PID $LAB_PID; exit" INT TERM EXIT

# Wait for all background processes
wait
