import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class IntegrateCnnCliTest(unittest.TestCase):
    def test_backend_posting_flags_are_documented_in_help(self):
        with tempfile.TemporaryDirectory() as tmp:
            stub_root = Path(tmp)
            (stub_root / "cv2.py").write_text("", encoding="utf-8")
            (stub_root / "dlib.py").write_text("", encoding="utf-8")
            (stub_root / "numpy.py").write_text("", encoding="utf-8")
            (stub_root / "pygame.py").write_text("", encoding="utf-8")
            (stub_root / "imutils").mkdir()
            (stub_root / "imutils" / "__init__.py").write_text("", encoding="utf-8")
            (stub_root / "imutils" / "face_utils.py").write_text("", encoding="utf-8")
            (stub_root / "scipy" / "spatial").mkdir(parents=True)
            (stub_root / "scipy" / "__init__.py").write_text("", encoding="utf-8")
            (stub_root / "scipy" / "spatial" / "__init__.py").write_text("", encoding="utf-8")
            (stub_root / "scipy" / "spatial" / "distance.py").write_text("", encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(ROOT / "integrate_cnn.py"), "--help"],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
                env={"PYTHONPATH": str(stub_root)},
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--trip-id", result.stdout)
        self.assertIn("--backend-url", result.stdout)
        self.assertIn("--api-timeout", result.stdout)


if __name__ == "__main__":
    unittest.main()
