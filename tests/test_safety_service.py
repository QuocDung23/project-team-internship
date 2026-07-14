import unittest

from backend.services.safety_service import calculate_safety_score, safety_grade


class SafetyServiceTest(unittest.TestCase):
    def test_score_uses_warning_and_critical_alert_penalties(self):
        self.assertEqual(calculate_safety_score(0, 0), 100.0)
        self.assertEqual(calculate_safety_score(1, 0), 95.0)
        self.assertEqual(calculate_safety_score(1, 1), 90.0)
        self.assertEqual(calculate_safety_score(30, 30), 0.0)

    def test_grade_boundaries(self):
        self.assertEqual(safety_grade(80), "A")
        self.assertEqual(safety_grade(79), "B")
        self.assertEqual(safety_grade(60), "B")
        self.assertEqual(safety_grade(59), "C")


if __name__ == "__main__":
    unittest.main()
