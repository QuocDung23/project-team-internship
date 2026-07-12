#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python}"

cd "$ROOT_DIR"

echo "Installing Python dependencies..."
"$PYTHON_BIN" -m pip install -r requirements.txt -r backend/requirements.txt

echo "Installing frontend dependencies..."
(
  cd frontend
  npm install
)

echo "Starting database (Docker Compose)..."
if command -v docker &>/dev/null; then
  docker-compose up -d
else
  echo "WARNING: docker not found — skipping DB start"
fi

echo "Setup complete."
