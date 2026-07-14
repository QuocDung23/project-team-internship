"""Backward-compatible launcher for the misspelled detector entrypoint.

Some local scripts/docs use ``intergrate_cnn.py``. Keep that command working by
delegating to the canonical ``integrate_cnn.py`` launcher.
"""

from __future__ import annotations

import runpy
from pathlib import Path


def main() -> None:
    target = Path(__file__).with_name("integrate_cnn.py")
    runpy.run_path(str(target), run_name="__main__")


if __name__ == "__main__":
    main()
