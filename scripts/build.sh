#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python}"

cd "$ROOT_DIR"

echo "Validating database schema..."
"$PYTHON_BIN" -m backend.db.schema validate

echo "Checking Python syntax..."
compile_targets=(
  integrate_cnn.py
  intergrate_cnn.py
  detector_backend.py
  probe_cameras.py
)

while IFS= read -r -d '' file; do
  compile_targets+=("$file")
done < <(find backend ai_runtime tools -type f -name '*.py' -print0)

"$PYTHON_BIN" -m py_compile "${compile_targets[@]}"

echo "Building frontend..."
(
  cd frontend
  npm run build
)

echo "Build completed."
