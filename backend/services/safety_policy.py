from backend.models.safety_event import SafetyEventType


DROWSINESS_PAIR_WINDOW_SECONDS = 30
DROWSINESS_ESCALATION_WINDOW_SECONDS = 60
YAWN_PAIR_WINDOW_SECONDS = 20

WARNING_ALERT_PENALTY = 5
CRITICAL_ALERT_PENALTY = 10
GRADE_A_MIN = 80
GRADE_B_MIN = 60

DROWSINESS_CANDIDATE_TYPES = {
    SafetyEventType.DROWSINESS_DETECTED,
    SafetyEventType.EYES_CLOSED,
}
YAWN_CANDIDATE_TYPES = {
    SafetyEventType.YAWNING_DETECTED,
    SafetyEventType.YAWNING,
}


def aggregation_kind(event_type: SafetyEventType) -> str | None:
    if event_type in DROWSINESS_CANDIDATE_TYPES:
        return "drowsiness"
    if event_type in YAWN_CANDIDATE_TYPES:
        return "yawning"
    return None


def pair_window_seconds(kind: str) -> int:
    if kind == "drowsiness":
        return DROWSINESS_PAIR_WINDOW_SECONDS
    if kind == "yawning":
        return YAWN_PAIR_WINDOW_SECONDS
    raise ValueError(f"unknown aggregation kind: {kind}")
