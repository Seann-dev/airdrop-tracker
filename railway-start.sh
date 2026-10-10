#!/bin/sh
# Railway entrypoint: backend (uvicorn) on a private port, SPA server on $PORT.
set -e

export BACKEND_PORT="${BACKEND_PORT:-8001}"
export BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"
export PORT="${PORT:-8000}"

# Backend in background (internal only)
python -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" &

# SPA + /api proxy in foreground on Railway's public $PORT
exec python frontend/server.py
