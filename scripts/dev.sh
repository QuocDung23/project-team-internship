#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT_WAS_SET="${BACKEND_PORT+x}"
BACKEND_PORT="${BACKEND_PORT:-8001}"
if [[ -z "$BACKEND_PORT_WAS_SET" ]]; then
  BACKEND_PORT="$(
    BACKEND_HOST="$BACKEND_HOST" BACKEND_PORT="$BACKEND_PORT" "$PYTHON_BIN" - <<'PY'
import os
import socket

host = os.environ["BACKEND_HOST"]
port = int(os.environ["BACKEND_PORT"])
while True:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
        except OSError:
            port += 1
            continue
    print(port)
    break
PY
  )"
fi
VITE_BACKEND_PROXY_TARGET="${VITE_BACKEND_PROXY_TARGET:-http://${BACKEND_HOST}:${BACKEND_PORT}}"
DETECTOR_ENABLED="${DETECTOR_ENABLED:-true}"
DETECTOR_SCRIPT="${DETECTOR_SCRIPT:-intergrate_cnn.py}"
DETECTOR_CAMERA="${DETECTOR_CAMERA:-0}"
DETECTOR_BACKEND="${DETECTOR_BACKEND:-msmf}"
DETECTOR_DEVICE_NAME="${DETECTOR_DEVICE_NAME:-}"

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
echo "Proxying frontend /api requests to ${VITE_BACKEND_PROXY_TARGET}"
(
  cd frontend
  VITE_BACKEND_PROXY_TARGET="$VITE_BACKEND_PROXY_TARGET" npm run dev
) &
PIDS+=("$!")

if [[ "$DETECTOR_ENABLED" != "false" && "$DETECTOR_ENABLED" != "0" ]]; then
  echo "Starting detector from ${DETECTOR_SCRIPT} on camera ${DETECTOR_CAMERA}"
  DETECTOR_ARGS=(
    "$DETECTOR_SCRIPT"
    --backend "$DETECTOR_BACKEND"
    --monitoring-backend-url "${VITE_BACKEND_PROXY_TARGET}/api/v1"
    --safety-backend-url "$VITE_BACKEND_PROXY_TARGET"
  )
  if [[ -n "$DETECTOR_DEVICE_NAME" ]]; then
    DETECTOR_ARGS+=(--device-name "$DETECTOR_DEVICE_NAME")
  else
    DETECTOR_ARGS+=(--camera "$DETECTOR_CAMERA")
  fi
  "$PYTHON_BIN" "${DETECTOR_ARGS[@]}" &
  PIDS+=("$!")
fi

echo
echo "Development services are running. Press Ctrl+C to stop."
wait -n "${PIDS[@]}"
