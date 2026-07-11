import json
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from backend.db.connection import get_engine
from backend.models.safety_event import SafetyEventSeverity, SafetyEventType


SAFETY_EVENT_COLUMNS = """
    safety_event_id,
    event_id,
    event_type::text AS event_type,
    severity::text AS severity,
    source,
    occurred_at,
    monitoring_session_id,
    trip_id,
    driver_id,
    vehicle_id,
    confidence,
    duration_ms,
    details,
    created_at
"""


def _row_to_safety_event(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    event = dict(row)
    event["safety_event_id"] = str(event["safety_event_id"])
    event["event_id"] = str(event["event_id"])
    event["event_type"] = SafetyEventType(event["event_type"])
    event["severity"] = SafetyEventSeverity(event["severity"])
    for key in ("monitoring_session_id", "trip_id", "driver_id", "vehicle_id"):
        if event.get(key) is not None:
            event[key] = str(event[key])
    event["confidence"] = float(event["confidence"])
    if isinstance(event.get("details"), str):
        event["details"] = json.loads(event["details"])
    return event


class SafetyEventRepository:
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()

    def find_by_event_id(self, event_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {SAFETY_EVENT_COLUMNS}
                        FROM safety_events
                        WHERE event_id = :event_id
                        LIMIT 1
                        """
                    ),
                    {"event_id": event_id},
                )
                .mappings()
                .first()
            )
        return _row_to_safety_event(row)

    def trip_exists(self, trip_id: str) -> bool:
        return self._exists("trips", "trip_id", trip_id)

    def active_trip_exists(self, trip_id: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT 1
                        FROM trips
                        WHERE trip_id = :trip_id
                          AND status = 'in_progress'
                        LIMIT 1
                        """
                    ),
                    {"trip_id": trip_id},
                )
                .first()
            )
        return row is not None

    def monitoring_session_belongs_to_trip(self, *, monitoring_session_id: str, trip_id: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT 1
                        FROM monitoring_sessions
                        WHERE monitoring_session_id = :monitoring_session_id
                          AND trip_id = :trip_id
                          AND status = 'active'
                        LIMIT 1
                        """
                    ),
                    {"monitoring_session_id": monitoring_session_id, "trip_id": trip_id},
                )
                .first()
            )
        return row is not None

    def driver_owns_active_trip(self, *, trip_id: str, user_id: str, driver_email: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT 1
                        FROM trips t
                        LEFT JOIN trip_assignments ta ON ta.trip_id = t.trip_id
                        LEFT JOIN drivers d ON d.driver_id = ta.driver_id
                        WHERE t.trip_id = :trip_id
                          AND t.status = 'in_progress'
                          AND (
                            t.created_by = :user_id
                            OR lower(d.email) = lower(:driver_email)
                          )
                        LIMIT 1
                        """
                    ),
                    {"trip_id": trip_id, "user_id": user_id, "driver_email": driver_email},
                )
                .first()
            )
        return row is not None

    def driver_exists(self, driver_id: str) -> bool:
        return self._exists("drivers", "driver_id", driver_id)

    def vehicle_exists(self, vehicle_id: str) -> bool:
        return self._exists("vehicles", "vehicle_id", vehicle_id)

    def ingest_event(self, payload: dict[str, Any], *, create_alert: bool) -> dict[str, Any]:
        with self.engine.begin() as connection:
            existing = (
                connection.execute(
                    text("SELECT 1 FROM safety_events WHERE event_id = :event_id LIMIT 1"),
                    {"event_id": payload["event_id"]},
                )
                .mappings()
                .first()
            )
            if existing is not None:
                raise DuplicateSafetyEventError(payload["event_id"])

            row = (
                connection.execute(
                    text(
                        f"""
                        INSERT INTO safety_events (
                            event_id,
                            monitoring_session_id,
                            event_type,
                            severity,
                            source,
                            occurred_at,
                            trip_id,
                            driver_id,
                            vehicle_id,
                            confidence,
                            duration_ms,
                            details
                        )
                        VALUES (
                            :event_id,
                            :monitoring_session_id,
                            CAST(:event_type AS safety_event_type),
                            CAST(:severity AS event_severity),
                            :source,
                            :occurred_at,
                            :trip_id,
                            :driver_id,
                            :vehicle_id,
                            :confidence,
                            :duration_ms,
                            CAST(:details AS jsonb)
                        )
                        RETURNING {SAFETY_EVENT_COLUMNS}
                        """
                    ),
                    {
                        **payload,
                        "details": json.dumps(payload["details"]),
                    },
                )
                .mappings()
                .one()
            )
            event = _row_to_safety_event(row)
            if event is None:
                raise RuntimeError("created safety event was not returned")

            alert_id = None
            if create_alert:
                alert_row = (
                    connection.execute(
                        text(
                            """
                            INSERT INTO alerts (
                                trip_id,
                                driver_id,
                                vehicle_id,
                                severity,
                                alert_type,
                                title,
                                message
                            )
                            VALUES (
                                :trip_id,
                                :driver_id,
                                :vehicle_id,
                                'critical',
                                :alert_type,
                                :title,
                                :message
                            )
                            RETURNING alert_id
                            """
                        ),
                        {
                            "trip_id": event["trip_id"],
                            "driver_id": event["driver_id"],
                            "vehicle_id": event["vehicle_id"],
                            "alert_type": self._alert_type(event["event_type"]),
                            "title": self._alert_title(event["event_type"]),
                            "message": (
                                f"High severity safety event {event['event_type'].value} "
                                f"detected with confidence {event['confidence']:.2f}."
                            ),
                        },
                    )
                    .mappings()
                    .one()
                )
                alert_id = str(alert_row["alert_id"])
                connection.execute(
                    text(
                        """
                        INSERT INTO alert_safety_events (alert_id, safety_event_id)
                        VALUES (:alert_id, :safety_event_id)
                        """
                    ),
                    {"alert_id": alert_id, "safety_event_id": event["safety_event_id"]},
                )

            event["alert_id"] = alert_id
            return event

    def _exists(self, table: str, column: str, value: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(f"SELECT 1 FROM {table} WHERE {column} = :value LIMIT 1"),
                    {"value": value},
                )
                .mappings()
                .first()
            )
        return row is not None

    def _alert_type(self, event_type: SafetyEventType) -> str:
        if event_type in {SafetyEventType.CAMERA_BLOCKED, SafetyEventType.NO_FACE_DETECTED}:
            return "camera_issue"
        if event_type in {SafetyEventType.DISTRACTION, SafetyEventType.HEAD_NOD, SafetyEventType.HEAD_NODDING_DETECTED}:
            return "driver_inattention"
        return "drowsiness"

    def _alert_title(self, event_type: SafetyEventType) -> str:
        return f"High severity {event_type.value.replace('_', ' ')}"


class DuplicateSafetyEventError(Exception):
    pass
