import json
from typing import Any

from sqlalchemy import bindparam
from sqlalchemy import text
from sqlalchemy.engine import Engine

from backend.db.connection import get_engine
from backend.models.safety_event import SafetyEventSeverity, SafetyEventType
from backend.services.safety_policy import DROWSINESS_ESCALATION_WINDOW_SECONDS


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

    def ingest_event(
        self,
        payload: dict[str, Any],
        *,
        aggregation_kind: str | None = None,
        aggregation_window_seconds: int | None = None,
    ) -> dict[str, Any]:
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
            if aggregation_kind and aggregation_window_seconds:
                alert_id = self._maybe_create_aggregated_alert(
                    connection,
                    event=event,
                    kind=aggregation_kind,
                    window_seconds=aggregation_window_seconds,
                )

            event["alert_id"] = alert_id
            return event

    def _maybe_create_aggregated_alert(
        self,
        connection,
        *,
        event: dict[str, Any],
        kind: str,
        window_seconds: int,
    ) -> str | None:
        event_types = self._candidate_event_types(kind)
        rows = (
            connection.execute(
                text(
                    """
                    SELECT
                        se.safety_event_id,
                        se.event_type::text AS event_type,
                        se.occurred_at,
                        se.confidence,
                        se.driver_id,
                        se.vehicle_id
                    FROM safety_events se
                    WHERE se.trip_id = :trip_id
                      AND se.event_type::text IN :event_types
                      AND se.occurred_at >= :occurred_at - (:window_seconds * INTERVAL '1 second')
                      AND se.occurred_at <= :occurred_at
                      AND NOT EXISTS (
                        SELECT 1
                        FROM alert_safety_events ase
                        WHERE ase.safety_event_id = se.safety_event_id
                      )
                    ORDER BY se.occurred_at ASC, se.created_at ASC
                    LIMIT 2
                    """
                ).bindparams(bindparam("event_types", expanding=True)),
                {
                    "trip_id": event["trip_id"],
                    "event_types": tuple(event_type.value for event_type in event_types),
                    "occurred_at": event["occurred_at"],
                    "window_seconds": window_seconds,
                },
            )
            .mappings()
            .all()
        )
        if len(rows) < 2:
            return None

        severity = self._aggregated_alert_severity(connection, event=event, kind=kind)
        alert_type = "drowsiness"
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
                        message,
                        escalated_at
                    )
                    VALUES (
                        :trip_id,
                        :driver_id,
                        :vehicle_id,
                        CAST(:alert_severity AS alert_severity),
                        CAST(:alert_type AS alert_type),
                        :title,
                        :message,
                        CASE WHEN :alert_severity = 'critical' THEN now() ELSE NULL END
                    )
                    RETURNING alert_id
                    """
                ),
                {
                    "trip_id": event["trip_id"],
                    "driver_id": event["driver_id"] or rows[-1]["driver_id"],
                    "vehicle_id": event["vehicle_id"] or rows[-1]["vehicle_id"],
                    "alert_severity": severity,
                    "alert_type": alert_type,
                    "title": self._aggregated_alert_title(kind, severity),
                    "message": self._aggregated_alert_message(kind, severity, rows),
                    "occurred_at": event["occurred_at"],
                },
            )
            .mappings()
            .one()
        )
        alert_id = str(alert_row["alert_id"])
        for row in rows:
            connection.execute(
                text(
                    """
                    INSERT INTO alert_safety_events (alert_id, safety_event_id)
                    VALUES (:alert_id, :safety_event_id)
                    """
                ),
                {"alert_id": alert_id, "safety_event_id": row["safety_event_id"]},
            )
        return alert_id

    def _aggregated_alert_severity(self, connection, *, event: dict[str, Any], kind: str) -> str:
        if kind != "drowsiness":
            return "warning"
        row = (
            connection.execute(
                text(
                    """
                    SELECT 1
                    FROM alerts
                    WHERE trip_id = :trip_id
                      AND alert_type = 'drowsiness'
                      AND opened_at >= now() - (:window_seconds * INTERVAL '1 second')
                    ORDER BY opened_at DESC
                    LIMIT 1
                    """
                ),
                {
                    "trip_id": event["trip_id"],
                    "window_seconds": DROWSINESS_ESCALATION_WINDOW_SECONDS,
                },
            )
            .first()
        )
        return "critical" if row is not None else "warning"

    def _candidate_event_types(self, kind: str) -> set[SafetyEventType]:
        if kind == "drowsiness":
            return {SafetyEventType.DROWSINESS_DETECTED, SafetyEventType.EYES_CLOSED}
        if kind == "yawning":
            return {SafetyEventType.YAWNING_DETECTED, SafetyEventType.YAWNING}
        raise ValueError(f"unknown aggregation kind: {kind}")

    def _aggregated_alert_title(self, kind: str, severity: str) -> str:
        label = "Critical" if severity == "critical" else "Warning"
        if kind == "yawning":
            return f"{label} yawning alert"
        return f"{label} drowsiness alert"

    def _aggregated_alert_message(self, kind: str, severity: str, rows: list[Any]) -> str:
        label = "critical" if severity == "critical" else "warning"
        if kind == "yawning":
            return f"Two separate yawning events were detected within 20 seconds; created a {label} alert."
        return f"Two separate drowsiness events were detected within 30 seconds; created a {label} alert."

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

    def _alert_severity(self, severity: SafetyEventSeverity) -> str:
        return "critical" if severity == SafetyEventSeverity.HIGH else "warning"

    def _alert_title(self, event_type: SafetyEventType, severity: SafetyEventSeverity) -> str:
        label = "Critical" if severity == SafetyEventSeverity.HIGH else "Warning"
        return f"{label} {event_type.value.replace('_', ' ')}"


class DuplicateSafetyEventError(Exception):
    pass
