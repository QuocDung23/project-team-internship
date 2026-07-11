#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python}"

cd "$ROOT_DIR"

echo "Running Python tests..."
"$PYTHON_BIN" -m unittest discover -s tests

echo "Checking Python syntax..."
"$PYTHON_BIN" -m py_compile \
  integrate_cnn.py \
  detector_backend.py \
  backend/app.py \
  backend/models/schemas.py \
  backend/services/*.py \
  backend/routes/*.py \
  backend/core/*.py \
  backend/db/*.py \
  backend/auth/*.py \
  backend/repositories/*.py \
  backend/api/routes/*.py

echo "Running frontend checks..."
(
  cd frontend
  npm run lint
  npm run build
  npm run test
)

echo "All checks passed."
