#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
DETECTOR_ENABLED="${DETECTOR_ENABLED:-true}"
DETECTOR_SCRIPT="${DETECTOR_SCRIPT:-intergrate_cnn.py}"
DETECTOR_CAMERA="${DETECTOR_CAMERA:-0}"

cd "$ROOT_DIR"

cleanup() {
  local status=$?
  echo
  echo "Stopping development servers..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  exit "$status"
}

PIDS=()
trap cleanup INT TERM EXIT

echo "Starting FastAPI backend on http://${BACKEND_HOST}:${BACKEND_PORT}"
"$PYTHON_BIN" -m uvicorn backend.app:app --reload --host "$BACKEND_HOST" --port "$BACKEND_PORT" &
PIDS+=("$!")

echo "Starting Vite frontend..."
(
  cd frontend
  npm run dev
) &
PIDS+=("$!")

if [[ "$DETECTOR_ENABLED" != "false" && "$DETECTOR_ENABLED" != "0" ]]; then
  echo "Starting detector from ${DETECTOR_SCRIPT} on camera ${DETECTOR_CAMERA}"
  "$PYTHON_BIN" "$DETECTOR_SCRIPT" --camera "$DETECTOR_CAMERA" &
  PIDS+=("$!")
fi

echo
echo "Development services are running. Press Ctrl+C to stop."
wait -n "${PIDS[@]}"
