import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class IntegrateCnnCliTest(unittest.TestCase):
    def test_integrate_cnn_help_delegates_to_event_enabled_runtime(self):
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
            (stub_root / "tensorflow").mkdir()
            (stub_root / "tensorflow" / "__init__.py").write_text("", encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(ROOT / "integrate_cnn.py"), "--help"],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
                env={"PYTHONPATH": str(stub_root)},
            )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--camera", result.stdout)
        self.assertIn("--backend", result.stdout)
        self.assertIn("--model", result.stdout)
        self.assertIn("--class-json", result.stdout)
        self.assertIn("--disable-safety-events", result.stdout)
        self.assertIn("--publish-safety-events-backend", result.stdout)
        self.assertIn("--safety-backend-url", result.stdout)
        self.assertIn("--safety-backend-token", result.stdout)
        self.assertIn("--monitoring-fps", result.stdout)
        self.assertIn("--monitoring-jpeg-quality", result.stdout)

    def test_integrate_cnn_import_does_not_start_detector(self):
        result = subprocess.run(
            [sys.executable, "-c", "import integrate_cnn; print('import-ok')"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "import-ok")

    def test_event_runtime_keeps_per_frame_backend_io_out_of_camera_loop(self):
        source = (ROOT / "integrate_cnn_with_events.py").read_text(encoding="utf-8")

        self.assertNotIn("from detector_backend import post_monitoring_frame", source)
        self.assertNotIn("post_monitoring_frame(", source)
        self.assertNotIn("post_monitoring_snapshot(", source)
        self.assertNotIn("publish_monitoring_state(", source)


if __name__ == "__main__":
    unittest.main()
