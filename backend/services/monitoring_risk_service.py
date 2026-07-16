import logging
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from backend.models.safety_event import SafetyEventSeverity, SafetyEventType
from backend.repositories.safety_event_repository import (
    DuplicateSafetyEventError,
    SafetyEventRepository,
)
from backend.services.safety_policy import aggregation_kind, pair_window_seconds


LOGGER = logging.getLogger(__name__)

DROWSINESS_COOLDOWN_SECONDS = 5.0
YAWNING_COOLDOWN_SECONDS = 10.0
HEAD_NOD_COOLDOWN_SECONDS = 10.0
NO_FACE_MIN_SECONDS = 3.0
NO_FACE_COOLDOWN_SECONDS = 15.0
DROWSINESS_CRITICAL_SCORE = 80


@dataclass(frozen=True)
class RiskCandidate:
    key: str
    event_type: SafetyEventType
    severity: SafetyEventSeverity
    confidence: float
    duration_ms: int
    cooldown_seconds: float
    create_immediate_alert: bool = False


class MonitoringRiskPersistenceService:
    """Turns live monitoring snapshots into durable safety events without spamming DB writes."""

    def __init__(self, repository: SafetyEventRepository | None = None) -> None:
        self.repository = repository or SafetyEventRepository()
        self._lock = threading.Lock()
        self._last_persisted_at: dict[tuple[str, str], float] = {}
        self._no_face_started_at: dict[str, float] = {}
        self.failure_count = 0

    def persist_snapshot_risks(self, snapshot: dict[str, Any]) -> list[dict[str, Any]]:
        trip_id = _normalized_text(snapshot.get("trip_id"))
        if not trip_id:
            return []

        try:
            if not self.repository.active_trip_exists(trip_id):
                return []

            now = time.time()
            candidates = self._risk_candidates(snapshot, trip_id=trip_id, now=now)
            persisted = []
            for candidate in candidates:
                if not self._claim_cooldown(trip_id, candidate.key, candidate.cooldown_seconds, now):
                    continue
                event = self._persist_candidate(snapshot, trip_id=trip_id, candidate=candidate)
                if event is not None:
                    persisted.append(event)
            return persisted
        except Exception:
            self.failure_count += 1
            LOGGER.exception("Realtime monitoring risk persistence failed for trip_id=%s", trip_id)
            return []

    def reset_state(self) -> None:
        with self._lock:
            self._last_persisted_at.clear()
            self._no_face_started_at.clear()
        self.failure_count = 0

    def _risk_candidates(self, snapshot: dict[str, Any], *, trip_id: str, now: float) -> list[RiskCandidate]:
        candidates: list[RiskCandidate] = []
        fps = _positive_float(snapshot.get("fps"))

        dws_score = _safe_float(snapshot.get("dws_score"), default=0.0)
        drowsiness_critical = bool(snapshot.get("alarm_on")) or dws_score >= DROWSINESS_CRITICAL_SCORE
        if bool(snapshot.get("ear_alert")) or drowsiness_critical:
            event_type = SafetyEventType.DROWSINESS_DETECTED if drowsiness_critical else SafetyEventType.EYES_CLOSED
            candidates.append(
                RiskCandidate(
                    key="drowsiness",
                    event_type=event_type,
                    severity=SafetyEventSeverity.HIGH if drowsiness_critical else SafetyEventSeverity.MEDIUM,
                    confidence=_confidence(snapshot, fallback=dws_score / 100.0 if drowsiness_critical else 0.8),
                    duration_ms=_counter_duration_ms(snapshot.get("ear_counter"), fps),
                    cooldown_seconds=DROWSINESS_COOLDOWN_SECONDS,
                    create_immediate_alert=drowsiness_critical,
                )
            )

        if bool(snapshot.get("mar_alert")):
            candidates.append(
                RiskCandidate(
                    key="yawning",
                    event_type=SafetyEventType.YAWNING_DETECTED,
                    severity=SafetyEventSeverity.MEDIUM,
                    confidence=_confidence(snapshot, fallback=0.75),
                    duration_ms=_counter_duration_ms(snapshot.get("mar_counter"), fps),
                    cooldown_seconds=YAWNING_COOLDOWN_SECONDS,
                )
            )

        if bool(snapshot.get("pose_alert")):
            candidates.append(
                RiskCandidate(
                    key="head_nod",
                    event_type=SafetyEventType.HEAD_NODDING_DETECTED,
                    severity=SafetyEventSeverity.MEDIUM,
                    confidence=_confidence(snapshot, fallback=0.75),
                    duration_ms=_counter_duration_ms(snapshot.get("pose_counter"), fps),
                    cooldown_seconds=HEAD_NOD_COOLDOWN_SECONDS,
                    create_immediate_alert=True,
                )
            )

        if snapshot.get("face_detected") is False:
            with self._lock:
                started_at = self._no_face_started_at.setdefault(trip_id, now)
            no_face_seconds = max(0.0, now - started_at)
            if no_face_seconds >= NO_FACE_MIN_SECONDS:
                candidates.append(
                    RiskCandidate(
                        key="no_face",
                        event_type=SafetyEventType.NO_FACE_DETECTED,
                        severity=SafetyEventSeverity.MEDIUM,
                        confidence=1.0,
                        duration_ms=int(no_face_seconds * 1000),
                        cooldown_seconds=NO_FACE_COOLDOWN_SECONDS,
                        create_immediate_alert=True,
                    )
                )
        else:
            with self._lock:
                self._no_face_started_at.pop(trip_id, None)

        return candidates

    def _claim_cooldown(self, trip_id: str, key: str, cooldown_seconds: float, now: float) -> bool:
        cooldown_key = (trip_id, key)
        with self._lock:
            last_at = self._last_persisted_at.get(cooldown_key)
            if last_at is not None and now - last_at < cooldown_seconds:
                return False
            self._last_persisted_at[cooldown_key] = now
            return True

    def _persist_candidate(
        self,
        snapshot: dict[str, Any],
        *,
        trip_id: str,
        candidate: RiskCandidate,
    ) -> dict[str, Any] | None:
        occurred_at = _occurred_at(snapshot)
        kind = aggregation_kind(candidate.event_type)
        try:
            return self.repository.ingest_event(
                {
                    "event_id": _event_id(trip_id, candidate.key, occurred_at, candidate.cooldown_seconds),
                    "monitoring_session_id": _normalized_text(snapshot.get("monitoring_session_id")),
                    "event_type": candidate.event_type.value,
                    "severity": candidate.severity.value,
                    "source": "monitoring_snapshot",
                    "occurred_at": occurred_at,
                    "trip_id": trip_id,
                    "driver_id": _normalized_text(snapshot.get("driver_id")),
                    "vehicle_id": _normalized_text(snapshot.get("vehicle_id")),
                    "confidence": max(0.0, min(1.0, candidate.confidence)),
                    "duration_ms": max(0, candidate.duration_ms),
                    "details": _event_details(snapshot, risk_key=candidate.key),
                },
                aggregation_kind=kind,
                aggregation_window_seconds=pair_window_seconds(kind) if kind else None,
                create_immediate_alert=candidate.create_immediate_alert,
            )
        except DuplicateSafetyEventError:
            return None


def _event_details(snapshot: dict[str, Any], *, risk_key: str) -> dict[str, Any]:
    return {
        "risk_key": risk_key,
        "snapshot_timestamp": snapshot.get("timestamp"),
        "ear": snapshot.get("ear"),
        "mar": snapshot.get("mar"),
        "pitch": snapshot.get("pitch"),
        "dws_score": snapshot.get("dws_score"),
        "fps": snapshot.get("fps"),
        "ear_counter": snapshot.get("ear_counter"),
        "mar_counter": snapshot.get("mar_counter"),
        "pose_counter": snapshot.get("pose_counter"),
        "ear_threshold": snapshot.get("ear_threshold"),
        "mar_threshold": snapshot.get("mar_threshold"),
        "pitch_delta_threshold": snapshot.get("pitch_delta_threshold"),
        "cnn_confidence": snapshot.get("cnn_confidence"),
        "cnn_enabled": snapshot.get("cnn_enabled"),
        "alarm_on": snapshot.get("alarm_on"),
        "face_detected": snapshot.get("face_detected"),
    }


def _event_id(trip_id: str, key: str, occurred_at: datetime, cooldown_seconds: float) -> str:
    bucket = int(occurred_at.timestamp() // max(1.0, cooldown_seconds))
    return f"monitoring:{trip_id}:{key}:{bucket}"[:100]


def _occurred_at(snapshot: dict[str, Any]) -> datetime:
    timestamp_value = snapshot.get("timestamp")
    try:
        timestamp = float(timestamp_value)
    except (TypeError, ValueError):
        timestamp = time.time()
    if timestamp > 10_000_000_000:
        timestamp = timestamp / 1000.0
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def _counter_duration_ms(value: Any, fps: float | None) -> int:
    counter = _safe_float(value, default=0.0)
    if fps is None:
        return 0
    return int(max(0.0, counter / fps) * 1000)


def _confidence(snapshot: dict[str, Any], *, fallback: float) -> float:
    cnn_confidence = snapshot.get("cnn_confidence")
    if isinstance(cnn_confidence, (int, float)):
        return float(cnn_confidence)
    return fallback


def _positive_float(value: Any) -> float | None:
    parsed = _safe_float(value, default=0.0)
    return parsed if parsed > 0 else None


def _safe_float(value: Any, *, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalized_text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None
