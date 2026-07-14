#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${PYTHON:-}" ]]; then
  if [[ -x "$ROOT_DIR/venv/bin/python" ]]; then
    PYTHON_BIN="$ROOT_DIR/venv/bin/python"
  else
    PYTHON_BIN="python"
  fi
else
  PYTHON_BIN="$PYTHON"
fi
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

echo
echo "Development services are running. Press Ctrl+C to stop."
wait
