import unittest

from backend.models.safety_event import SafetyEventSeverity, SafetyEventType
from backend.repositories.safety_event_repository import SafetyEventRepository


class SafetyEventRepositoryTest(unittest.TestCase):
    def test_alert_severity_matches_safety_event_severity(self):
        repository = SafetyEventRepository.__new__(SafetyEventRepository)

        self.assertEqual(repository._alert_severity(SafetyEventSeverity.HIGH), "critical")
        self.assertEqual(repository._alert_severity(SafetyEventSeverity.MEDIUM), "warning")

    def test_yawning_is_not_mapped_to_backend_alert_type(self):
        repository = SafetyEventRepository.__new__(SafetyEventRepository)

        with self.assertRaises(ValueError):
            repository._alert_type(SafetyEventType.YAWNING_DETECTED)


if __name__ == "__main__":
    unittest.main()
