"""Compatibility entrypoint for the event-enabled drowsiness detector.

The detector implementation lives in ``integrate_cnn_with_events.py``.  This
file intentionally stays tiny so ``python integrate_cnn.py --camera 0`` keeps
working while sharing the same runtime, CLI options, camera handling, inference,
thresholds, timing, alarm behavior, and OpenCV UI.
"""

from __future__ import annotations

import runpy
from pathlib import Path


def main() -> None:
    target = Path(__file__).with_name("integrate_cnn_with_events.py")
    runpy.run_path(str(target), run_name="__main__")


if __name__ == "__main__":
    main()
