from __future__ import annotations

import runpy
import sys
from pathlib import Path


def main() -> None:
    """Run the original detector; ai_runtime is only an integration wrapper."""

    root = Path(__file__).resolve().parents[1]
    detector_path = root / "integrate_cnn.py"
    sys.argv[0] = str(detector_path)
    runpy.run_path(str(detector_path), run_name="__main__")


if __name__ == "__main__":
    main()
