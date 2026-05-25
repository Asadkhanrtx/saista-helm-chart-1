#!/bin/bash
set -e

# Change to the directory this script lives in so relative paths work
cd "$(dirname "$0")"

echo "[entrypoint] Running DB migration..."
python migrate_db.py

echo "[entrypoint] Starting user-service on port 5001..."
exec uvicorn app.main:app --host 0.0.0.0 --port 5001
