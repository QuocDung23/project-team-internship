import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.engine import Engine

from backend.db.connection import get_engine
from backend.models.driver import DriverStatus
from backend.models.trip import AssignmentStatus, TripStatus
from backend.models.vehicle import VehicleStatus


TRIP_COLUMNS = """
    trip_id,
    code,
    status,
    planned_start_at,
    planned_end_at,
    actual_start_at,
    actual_end_at,
    origin,
    destination,
    cancelled_reason,
    aborted_reason,
    created_by,
    created_at,
    updated_at
"""

TRIP_COLUMNS_PG = TRIP_COLUMNS.replace("status,", "status::text AS status,")

ASSIGNMENT_COLUMNS = """
    trip_assignment_id,
    trip_id,
    driver_id,
    vehicle_id,
    status,
    assigned_at,
    unassigned_at,
    created_at
"""

ASSIGNMENT_COLUMNS_PG = ASSIGNMENT_COLUMNS.replace("status,", "status::text AS status,")


def _row_to_trip(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    trip = dict(row)
    trip["trip_id"] = str(trip["trip_id"])
    trip["status"] = TripStatus(trip["status"])
    if trip.get("created_by") is not None:
        trip["created_by"] = str(trip["created_by"])
    return trip


def _row_to_assignment(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    assignment = dict(row)
    assignment["trip_assignment_id"] = str(assignment["trip_assignment_id"])
    assignment["trip_id"] = str(assignment["trip_id"])
    assignment["driver_id"] = str(assignment["driver_id"])
    assignment["vehicle_id"] = str(assignment["vehicle_id"])
    assignment["status"] = AssignmentStatus(assignment["status"])
    return assignment


def _now() -> datetime:
    return datetime.now(timezone.utc)


class TripRepository:
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
        self._dialect_name = self.engine.dialect.name

    @property
    def _is_postgres(self) -> bool:
        return self._dialect_name == "postgresql"

    @property
    def _trip_columns(self) -> str:
        return TRIP_COLUMNS_PG if self._is_postgres else TRIP_COLUMNS

    @property
    def _assignment_columns(self) -> str:
        return ASSIGNMENT_COLUMNS_PG if self._is_postgres else ASSIGNMENT_COLUMNS

    def list_trips(self, *, status: TripStatus | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        where_sql = ""
        if status is not None:
            where_sql = f"WHERE status = {self._status_param('status', 'trip_status')}"
            params["status"] = status.value

        with self.engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                        SELECT {self._trip_columns}
                        FROM trips
                        {where_sql}
                        ORDER BY created_at DESC
                        """
                    ),
                    params,
                )
                .mappings()
                .all()
            )
        return [self._with_latest_assignment(trip) for row in rows if (trip := _row_to_trip(row))]

    def list_trips_for_driver_email(
        self,
        *,
        driver_email: str,
        status: TripStatus | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"driver_email": driver_email}
        status_sql = ""
        if status is not None:
            status_sql = f"AND t.status = {self._status_param('status', 'trip_status')}"
            params["status"] = status.value

        with self.engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                        SELECT DISTINCT {", ".join("t." + column.strip() for column in TRIP_COLUMNS.split(",") if column.strip())}
                        FROM trips t
                        JOIN trip_assignments ta ON ta.trip_id = t.trip_id
                        JOIN drivers d ON d.driver_id = ta.driver_id
                        WHERE lower(d.email) = lower(:driver_email)
                        {status_sql}
                        ORDER BY t.created_at DESC
                        """
                    ),
                    params,
                )
                .mappings()
                .all()
            )
        return [self._with_latest_assignment(trip) for row in rows if (trip := _row_to_trip(row))]

    def list_trips_for_user(
        self,
        *,
        user_id: str,
        driver_email: str,
        status: TripStatus | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"user_id": user_id, "driver_email": driver_email}
        status_sql = ""
        if status is not None:
            status_sql = f"AND t.status = {self._status_param('status', 'trip_status')}"
            params["status"] = status.value

        with self.engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                        SELECT DISTINCT {", ".join("t." + column.strip() for column in TRIP_COLUMNS.split(",") if column.strip())}
                        FROM trips t
                        LEFT JOIN trip_assignments ta ON ta.trip_id = t.trip_id
                        LEFT JOIN drivers d ON d.driver_id = ta.driver_id
                        WHERE (
                            t.created_by = :user_id
                            OR lower(d.email) = lower(:driver_email)
                        )
                        {status_sql}
                        ORDER BY t.created_at DESC
                        """
                    ),
                    params,
                )
                .mappings()
                .all()
            )
        return [self._with_latest_assignment(trip) for row in rows if (trip := _row_to_trip(row))]

    def find_by_id(self, trip_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {self._trip_columns}
                        FROM trips
                        WHERE trip_id = :trip_id
                        LIMIT 1
                        """
                    ),
                    {"trip_id": trip_id},
                )
                .mappings()
                .first()
            )
        trip = _row_to_trip(row)
        return self._with_latest_assignment(trip) if trip else None

    def create_trip(
        self,
        *,
        code: str | None,
        status: TripStatus,
        planned_start_at: datetime | None,
        planned_end_at: datetime | None,
        origin: str | None,
        destination: str | None,
        created_by: str | None,
    ) -> dict[str, Any]:
        trip_id = str(uuid4()) if not self._is_postgres else None
        with self.engine.begin() as connection:
            if self._is_postgres:
                row = (
                    connection.execute(
                        text(
                            f"""
                            INSERT INTO trips (
                                code, status, planned_start_at, planned_end_at,
                                origin, destination, created_by
                            )
                            VALUES (
                                :code, CAST(:status AS trip_status), :planned_start_at,
                                :planned_end_at, :origin, :destination, :created_by
                            )
                            RETURNING {self._trip_columns}
                            """
                        ),
                        {
                            "code": code,
                            "status": status.value,
                            "planned_start_at": planned_start_at,
                            "planned_end_at": planned_end_at,
                            "origin": origin,
                            "destination": destination,
                            "created_by": created_by,
                        },
                    )
                    .mappings()
                    .one()
                )
            else:
                now = _now()
                row = (
                    connection.execute(
                        text(
                            f"""
                            INSERT INTO trips (
                                trip_id, code, status, planned_start_at, planned_end_at,
                                origin, destination, created_by, created_at, updated_at
                            )
                            VALUES (
                                :trip_id, :code, :status, :planned_start_at, :planned_end_at,
                                :origin, :destination, :created_by, :created_at, :updated_at
                            )
                            RETURNING {self._trip_columns}
                            """
                        ),
                        {
                            "trip_id": trip_id,
                            "code": code,
                            "status": status.value,
                            "planned_start_at": planned_start_at,
                            "planned_end_at": planned_end_at,
                            "origin": origin,
                            "destination": destination,
                            "created_by": created_by,
                            "created_at": now,
                            "updated_at": now,
                        },
                    )
                    .mappings()
                    .one()
                )
        trip = _row_to_trip(row)
        if trip is None:
            raise RuntimeError("created trip was not returned")
        trip["assignment"] = None
        return trip

    def find_driver_by_id(self, driver_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT driver_id, full_name, email, status{self._cast_text('driver_status')}
                        FROM drivers
                        WHERE driver_id = :driver_id
                        LIMIT 1
                        """
                    ),
                    {"driver_id": driver_id},
                )
                .mappings()
                .first()
            )
        if row is None:
            return None
        driver = dict(row)
        driver["driver_id"] = str(driver["driver_id"])
        driver["status"] = DriverStatus(driver["status"])
        return driver

    def find_driver_by_email(self, email: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT driver_id, full_name, email, status{self._cast_text('driver_status')}
                        FROM drivers
                        WHERE lower(email) = lower(:email)
                        LIMIT 1
                        """
                    ),
                    {"email": email},
                )
                .mappings()
                .first()
            )
        if row is None:
            return None
        driver = dict(row)
        driver["driver_id"] = str(driver["driver_id"])
        driver["status"] = DriverStatus(driver["status"])
        return driver

    def find_active_trip_for_user(self, *, user_id: str, driver_email: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT DISTINCT {", ".join("t." + column.strip() for column in TRIP_COLUMNS.split(",") if column.strip())}
                        FROM trips t
                        LEFT JOIN trip_assignments ta ON ta.trip_id = t.trip_id
                        LEFT JOIN drivers d ON d.driver_id = ta.driver_id
                        WHERE t.status = {self._status_param('status', 'trip_status')}
                          AND (
                            t.created_by = :user_id
                            OR lower(d.email) = lower(:driver_email)
                          )
                        ORDER BY t.created_at DESC
                        LIMIT 1
                        """
                    ),
                    {
                        "status": TripStatus.IN_PROGRESS.value,
                        "user_id": user_id,
                        "driver_email": driver_email,
                    },
                )
                .mappings()
                .first()
            )
        trip = _row_to_trip(row)
        return self._with_latest_assignment(trip) if trip else None

    def create_active_trip_for_user(
        self,
        *,
        code: str | None,
        origin: str | None,
        destination: str | None,
        created_by: str,
    ) -> dict[str, Any]:
        trip_id = str(uuid4()) if not self._is_postgres else None
        now = _now()
        with self.engine.begin() as connection:
            if self._is_postgres:
                row = (
                    connection.execute(
                        text(
                            f"""
                            INSERT INTO trips (
                                code, status, actual_start_at, origin, destination, created_by
                            )
                            VALUES (
                                :code, CAST(:status AS trip_status), :now,
                                :origin, :destination, :created_by
                            )
                            RETURNING {self._trip_columns}
                            """
                        ),
                        {
                            "code": code,
                            "status": TripStatus.IN_PROGRESS.value,
                            "now": now,
                            "origin": origin,
                            "destination": destination,
                            "created_by": created_by,
                        },
                    )
                    .mappings()
                    .one()
                )
            else:
                row = (
                    connection.execute(
                        text(
                            f"""
                            INSERT INTO trips (
                                trip_id, code, status, actual_start_at, origin,
                                destination, created_by, created_at, updated_at
                            )
                            VALUES (
                                :trip_id, :code, :status, :now, :origin,
                                :destination, :created_by, :now, :now
                            )
                            RETURNING {self._trip_columns}
                            """
                        ),
                        {
                            "trip_id": trip_id,
                            "code": code,
                            "status": TripStatus.IN_PROGRESS.value,
                            "now": now,
                            "origin": origin,
                            "destination": destination,
                            "created_by": created_by,
                        },
                    )
                    .mappings()
                    .one()
                )
        trip = _row_to_trip(row)
        if trip is None:
            raise RuntimeError("created trip was not returned")
        trip["assignment"] = None
        self._attach_driver_summary(trip)
        trip["monitoring_session"] = self.ensure_active_monitoring_session(trip["trip_id"])
        return trip

    def ensure_active_monitoring_session(
        self,
        trip_id: str,
        *,
        detector_instance_id: str | None = "demo-detector",
        camera_index: int | None = None,
    ) -> dict[str, Any]:
        with self.engine.begin() as connection:
            existing = (
                connection.execute(
                    text(
                        """
                        SELECT monitoring_session_id, trip_id, status, detector_instance_id,
                               camera_index, started_at, ended_at, last_snapshot_at, created_at
                        FROM monitoring_sessions
                        WHERE trip_id = :trip_id
                          AND status = 'active'
                        ORDER BY started_at DESC
                        LIMIT 1
                        """
                    ),
                    {"trip_id": trip_id},
                )
                .mappings()
                .first()
            )
            if existing is not None:
                return self._row_to_monitoring_session(existing)

            monitoring_session_id = str(uuid4()) if not self._is_postgres else None
            if self._is_postgres:
                row = (
                    connection.execute(
                        text(
                            """
                            INSERT INTO monitoring_sessions (
                                trip_id, detector_instance_id, camera_index
                            )
                            VALUES (:trip_id, :detector_instance_id, :camera_index)
                            RETURNING monitoring_session_id, trip_id, status::text AS status,
                                      detector_instance_id, camera_index, started_at, ended_at,
                                      last_snapshot_at, created_at
                            """
                        ),
                        {
                            "trip_id": trip_id,
                            "detector_instance_id": detector_instance_id,
                            "camera_index": camera_index,
                        },
                    )
                    .mappings()
                    .one()
                )
            else:
                now = _now()
                row = (
                    connection.execute(
                        text(
                            """
                            INSERT INTO monitoring_sessions (
                                monitoring_session_id, trip_id, status, detector_instance_id,
                                camera_index, started_at, created_at
                            )
                            VALUES (
                                :monitoring_session_id, :trip_id, 'active',
                                :detector_instance_id, :camera_index, :now, :now
                            )
                            RETURNING monitoring_session_id, trip_id, status, detector_instance_id,
                                      camera_index, started_at, ended_at, last_snapshot_at, created_at
                            """
                        ),
                        {
                            "monitoring_session_id": monitoring_session_id,
                            "trip_id": trip_id,
                            "detector_instance_id": detector_instance_id,
                            "camera_index": camera_index,
                            "now": now,
                        },
                    )
                    .mappings()
                    .one()
                )
        return self._row_to_monitoring_session(row)

    def end_active_monitoring_session(self, trip_id: str) -> None:
        with self.engine.begin() as connection:
            now = _now()
            connection.execute(
                text(
                    """
                    UPDATE monitoring_sessions
                    SET status = 'ended',
                        ended_at = :now
                    WHERE trip_id = :trip_id
                      AND status = 'active'
                    """
                ),
                {"trip_id": trip_id, "now": now},
            )

    def find_vehicle_by_id(self, vehicle_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT vehicle_id, plate_number, vehicle_type, status{self._cast_text('vehicle_status')}
                        FROM vehicles
                        WHERE vehicle_id = :vehicle_id
                        LIMIT 1
                        """
                    ),
                    {"vehicle_id": vehicle_id},
                )
                .mappings()
                .first()
            )
        if row is None:
            return None
        vehicle = dict(row)
        vehicle["vehicle_id"] = str(vehicle["vehicle_id"])
        vehicle["status"] = VehicleStatus(vehicle["status"])
        return vehicle

    def driver_has_active_session(self, driver_id: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT 1
                        FROM driver_sessions
                        WHERE driver_id = :driver_id
                          AND status = 'active'
                        LIMIT 1
                        """
                    ),
                    {"driver_id": driver_id},
                )
                .first()
            )
        return row is not None

    def find_active_assignment_for_trip(self, trip_id: str) -> dict[str, Any] | None:
        return self._find_assignment(
            """
            WHERE trip_id = :trip_id
              AND status IN ('assigned', 'in_progress')
            """,
            {"trip_id": trip_id},
        )

    def driver_has_active_assignment(self, driver_id: str) -> bool:
        return self._exists_active_assignment("driver_id", driver_id)

    def vehicle_has_active_assignment(self, vehicle_id: str) -> bool:
        return self._exists_active_assignment("vehicle_id", vehicle_id)

    def driver_email_has_trip_assignment(self, *, trip_id: str, driver_email: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT 1
                        FROM trip_assignments ta
                        JOIN drivers d ON d.driver_id = ta.driver_id
                        WHERE ta.trip_id = :trip_id
                          AND lower(d.email) = lower(:driver_email)
                        LIMIT 1
                        """
                    ),
                    {"trip_id": trip_id, "driver_email": driver_email},
                )
                .first()
            )
        return row is not None

    def update_trip_status(
        self,
        *,
        trip_id: str,
        status: TripStatus,
        cancelled_reason: str | None = None,
        aborted_reason: str | None = None,
    ) -> dict[str, Any] | None:
        fields = [f"status = {self._status_param('status', 'trip_status')}"]
        params: dict[str, Any] = {"trip_id": trip_id, "status": status.value}
        if cancelled_reason is not None:
            fields.append("cancelled_reason = :cancelled_reason")
            params["cancelled_reason"] = cancelled_reason
        if aborted_reason is not None:
            fields.append("aborted_reason = :aborted_reason")
            params["aborted_reason"] = aborted_reason
        if not self._is_postgres:
            fields.append("updated_at = :updated_at")
            params["updated_at"] = _now()

        return self._update_trip(fields=fields, params=params)

    def assign_trip(self, *, trip_id: str, driver_id: str, vehicle_id: str) -> dict[str, Any] | None:
        assignment_id = str(uuid4()) if not self._is_postgres else None
        with self.engine.begin() as connection:
            params: dict[str, Any] = {
                "trip_id": trip_id,
                "driver_id": driver_id,
                "vehicle_id": vehicle_id,
                "assigned_status": AssignmentStatus.ASSIGNED.value,
                "trip_status": TripStatus.ASSIGNED.value,
                "vehicle_status": VehicleStatus.ASSIGNED.value,
            }
            if self._is_postgres:
                connection.execute(
                    text(
                        """
                        INSERT INTO trip_assignments (trip_id, driver_id, vehicle_id, status)
                        VALUES (
                            :trip_id, :driver_id, :vehicle_id,
                            CAST(:assigned_status AS assignment_status)
                        )
                        """
                    ),
                    params,
                )
                row = (
                    connection.execute(
                        text(
                            f"""
                            UPDATE trips
                            SET status = CAST(:trip_status AS trip_status)
                            WHERE trip_id = :trip_id
                            RETURNING {self._trip_columns}
                            """
                        ),
                        params,
                    )
                    .mappings()
                    .first()
                )
                connection.execute(
                    text(
                        """
                        UPDATE vehicles
                        SET status = CAST(:vehicle_status AS vehicle_status)
                        WHERE vehicle_id = :vehicle_id
                        """
                    ),
                    params,
                )
            else:
                now = _now()
                params.update({"trip_assignment_id": assignment_id, "now": now})
                connection.execute(
                    text(
                        """
                        INSERT INTO trip_assignments (
                            trip_assignment_id, trip_id, driver_id, vehicle_id,
                            status, assigned_at, created_at
                        )
                        VALUES (
                            :trip_assignment_id, :trip_id, :driver_id, :vehicle_id,
                            :assigned_status, :now, :now
                        )
                        """
                    ),
                    params,
                )
                row = (
                    connection.execute(
                        text(
                            f"""
                            UPDATE trips
                            SET status = :trip_status,
                                updated_at = :now
                            WHERE trip_id = :trip_id
                            RETURNING {self._trip_columns}
                            """
                        ),
                        params,
                    )
                    .mappings()
                    .first()
                )
                connection.execute(
                    text(
                        """
                        UPDATE vehicles
                        SET status = :vehicle_status,
                            updated_at = :now
                        WHERE vehicle_id = :vehicle_id
                        """
                    ),
                    params,
                )
        trip = _row_to_trip(row)
        return self._with_latest_assignment(trip) if trip else None

    def start_trip(self, trip_id: str) -> dict[str, Any] | None:
        return self._transition_with_assignment(
            trip_id=trip_id,
            trip_status=TripStatus.IN_PROGRESS,
            assignment_status=AssignmentStatus.IN_PROGRESS,
            timestamp_field="actual_start_at",
        )

    def complete_trip(self, trip_id: str) -> dict[str, Any] | None:
        return self._transition_with_assignment_release(
            trip_id=trip_id,
            trip_status=TripStatus.COMPLETED,
            assignment_status=AssignmentStatus.COMPLETED,
            timestamp_field="actual_end_at",
        )

    def complete_active_trip(self, trip_id: str) -> dict[str, Any] | None:
        with self.engine.begin() as connection:
            now = _now()
            fields = [
                f"status = {self._status_param('trip_status', 'trip_status')}",
                "actual_end_at = :now",
            ]
            if not self._is_postgres:
                fields.append("updated_at = :now")
            row = (
                connection.execute(
                    text(
                        f"""
                        UPDATE trips
                        SET {", ".join(fields)}
                        WHERE trip_id = :trip_id
                          AND status = {self._status_param('active_status', 'trip_status')}
                        RETURNING {self._trip_columns}
                        """
                    ),
                    {
                        "trip_id": trip_id,
                        "trip_status": TripStatus.COMPLETED.value,
                        "active_status": TripStatus.IN_PROGRESS.value,
                        "now": now,
                    },
                )
                .mappings()
                .first()
            )
            connection.execute(
                text(
                    f"""
                    UPDATE trip_assignments
                    SET status = {self._status_param('assignment_status', 'assignment_status')},
                        unassigned_at = :now
                    WHERE trip_id = :trip_id
                      AND status IN ('assigned', 'in_progress')
                    """
                ),
                {
                    "trip_id": trip_id,
                    "assignment_status": AssignmentStatus.COMPLETED.value,
                    "now": now,
                },
            )
            connection.execute(
                text(
                    """
                    UPDATE monitoring_sessions
                    SET status = 'ended',
                        ended_at = :now
                    WHERE trip_id = :trip_id
                      AND status = 'active'
                    """
                ),
                {"trip_id": trip_id, "now": now},
            )
        trip = _row_to_trip(row)
        return self._with_latest_assignment(trip) if trip else None

    def driver_owns_trip(self, *, trip_id: str, user_id: str, driver_email: str) -> bool:
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

    def count_trip_safety_inputs(self, trip_id: str) -> dict[str, int]:
        with self.engine.connect() as connection:
            event_row = (
                connection.execute(
                    text(
                        """
                        SELECT
                            COUNT(*) AS total_events
                        FROM safety_events
                        WHERE trip_id = :trip_id
                        """
                    ),
                    {"trip_id": trip_id},
                )
                .mappings()
                .one()
            )
            alert_row = (
                connection.execute(
                    text(
                        """
                        SELECT
                            COUNT(*) AS alert_count,
                            COUNT(*) FILTER (WHERE severity = 'critical') AS critical_alerts
                        FROM alerts
                        WHERE trip_id = :trip_id
                        """
                    ),
                    {"trip_id": trip_id},
                )
                .mappings()
                .one()
            )
        total_events = int(event_row["total_events"])
        alert_count = int(alert_row["alert_count"])
        critical_alerts = int(alert_row["critical_alerts"])
        return {
            "total_events": total_events,
            "critical_events": critical_alerts,
            "warning_events": max(0, alert_count - critical_alerts),
            "alert_count": alert_count,
        }

    def find_safety_score(self, trip_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT
                            safety_score_id,
                            trip_id,
                            score,
                            grade::text AS grade,
                            total_events,
                            warning_events,
                            critical_events,
                            alert_count,
                            calculation_version,
                            explanation,
                            calculated_at
                        FROM safety_scores
                        WHERE trip_id = :trip_id
                        LIMIT 1
                        """
                    ),
                    {"trip_id": trip_id},
                )
                .mappings()
                .first()
            )
        return self._row_to_safety_score(row)

    def create_safety_score(
        self,
        *,
        trip_id: str,
        score: float,
        grade: str,
        total_events: int,
        warning_events: int,
        critical_events: int,
        alert_count: int,
        explanation: dict[str, Any],
    ) -> dict[str, Any]:
        score_id = str(uuid4()) if not self._is_postgres else None
        with self.engine.begin() as connection:
            if self._is_postgres:
                row = (
                    connection.execute(
                        text(
                            """
                            INSERT INTO safety_scores (
                                trip_id, score, grade, total_events, warning_events,
                                critical_events, alert_count, explanation
                            )
                            VALUES (
                                :trip_id, :score, CAST(:grade AS safety_grade), :total_events,
                                :warning_events, :critical_events, :alert_count,
                                CAST(:explanation AS jsonb)
                            )
                            ON CONFLICT (trip_id) DO NOTHING
                            RETURNING
                                safety_score_id,
                                trip_id,
                                score,
                                grade::text AS grade,
                                total_events,
                                warning_events,
                                critical_events,
                                alert_count,
                                calculation_version,
                                explanation,
                                calculated_at
                            """
                        ),
                        {
                            "trip_id": trip_id,
                            "score": score,
                            "grade": grade,
                            "total_events": total_events,
                            "warning_events": warning_events,
                            "critical_events": critical_events,
                            "alert_count": alert_count,
                            "explanation": json.dumps(explanation),
                        },
                    )
                    .mappings()
                    .first()
                )
            else:
                row = (
                    connection.execute(
                        text(
                            """
                            INSERT INTO safety_scores (
                                safety_score_id, trip_id, score, grade, total_events,
                                warning_events, critical_events, alert_count,
                                calculation_version, explanation, calculated_at
                            )
                            VALUES (
                                :safety_score_id, :trip_id, :score, :grade, :total_events,
                                :warning_events, :critical_events, :alert_count,
                                'v1', :explanation, :now
                            )
                            ON CONFLICT (trip_id) DO NOTHING
                            RETURNING
                                safety_score_id,
                                trip_id,
                                score,
                                grade,
                                total_events,
                                warning_events,
                                critical_events,
                                alert_count,
                                calculation_version,
                                explanation,
                                calculated_at
                            """
                        ),
                        {
                            "safety_score_id": score_id,
                            "trip_id": trip_id,
                            "score": score,
                            "grade": grade,
                            "total_events": total_events,
                            "warning_events": warning_events,
                            "critical_events": critical_events,
                            "alert_count": alert_count,
                            "explanation": json.dumps(explanation),
                            "now": _now(),
                        },
                    )
                    .mappings()
                    .first()
                )
        if row is None:
            existing = self.find_safety_score(trip_id)
            if existing is None:
                raise RuntimeError("safety score was not created")
            return existing
        score_row = self._row_to_safety_score(row)
        if score_row is None:
            raise RuntimeError("created safety score was not returned")
        return score_row

    def cancel_trip(self, *, trip_id: str, reason: str) -> dict[str, Any] | None:
        return self._transition_with_assignment_release(
            trip_id=trip_id,
            trip_status=TripStatus.CANCELLED,
            assignment_status=AssignmentStatus.CANCELLED,
            timestamp_field=None,
            cancelled_reason=reason,
        )

    def abort_trip(self, *, trip_id: str, reason: str) -> dict[str, Any] | None:
        return self._transition_with_assignment_release(
            trip_id=trip_id,
            trip_status=TripStatus.ABORTED,
            assignment_status=AssignmentStatus.RELEASED,
            timestamp_field="actual_end_at",
            aborted_reason=reason,
        )

    def _with_latest_assignment(self, trip: dict[str, Any]) -> dict[str, Any]:
        trip["assignment"] = self.find_latest_assignment_for_trip(trip["trip_id"])
        self._attach_driver_summary(trip)
        self._attach_vehicle_summary(trip)
        return trip

    def _attach_driver_summary(self, trip: dict[str, Any]) -> None:
        driver = None
        assignment = trip.get("assignment")
        if assignment is not None:
            driver = self._driver_summary_by_id(assignment["driver_id"])
        if driver is None and trip.get("created_by") is not None:
            driver = self._driver_summary_by_user_id(trip["created_by"])

        trip["driver_id"] = driver["driver_id"] if driver else None
        trip["driver_name"] = driver["full_name"] if driver else None
        trip["driver_email"] = driver["email"] if driver else None

    def _attach_vehicle_summary(self, trip: dict[str, Any]) -> None:
        assignment = trip.get("assignment")
        if assignment is None:
            trip["vehicle_plate"] = None
            return
        vehicle = self.find_vehicle_by_id(assignment["vehicle_id"])
        trip["vehicle_plate"] = vehicle["plate_number"] if vehicle else None

    def _driver_summary_by_id(self, driver_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT driver_id, full_name, email
                        FROM drivers
                        WHERE driver_id = :driver_id
                        LIMIT 1
                        """
                    ),
                    {"driver_id": driver_id},
                )
                .mappings()
                .first()
            )
        if row is None:
            return None
        driver = dict(row)
        driver["driver_id"] = str(driver["driver_id"])
        return driver

    def _driver_summary_by_user_id(self, user_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT d.driver_id, d.full_name, d.email
                        FROM users u
                        JOIN drivers d ON lower(d.email) = lower(u.email)
                        WHERE u.user_id = :user_id
                        ORDER BY d.updated_at DESC
                        LIMIT 1
                        """
                    ),
                    {"user_id": user_id},
                )
                .mappings()
                .first()
            )
        if row is None:
            return None
        driver = dict(row)
        driver["driver_id"] = str(driver["driver_id"])
        return driver

    def find_latest_assignment_for_trip(self, trip_id: str) -> dict[str, Any] | None:
        return self._find_assignment(
            "WHERE trip_id = :trip_id",
            {"trip_id": trip_id},
            order_sql="ORDER BY created_at DESC",
        )

    def _find_assignment(
        self,
        where_sql: str,
        params: dict[str, Any],
        *,
        order_sql: str = "ORDER BY created_at DESC",
    ) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {self._assignment_columns}
                        FROM trip_assignments
                        {where_sql}
                        {order_sql}
                        LIMIT 1
                        """
                    ),
                    params,
                )
                .mappings()
                .first()
            )
        return _row_to_assignment(row)

    def _exists_active_assignment(self, column: str, value: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT 1
                        FROM trip_assignments
                        WHERE {column} = :value
                          AND status IN ('assigned', 'in_progress')
                        LIMIT 1
                        """
                    ),
                    {"value": value},
                )
                .first()
            )
        return row is not None

    def _transition_with_assignment(
        self,
        *,
        trip_id: str,
        trip_status: TripStatus,
        assignment_status: AssignmentStatus,
        timestamp_field: str | None,
    ) -> dict[str, Any] | None:
        with self.engine.begin() as connection:
            now = _now()
            fields = [f"status = {self._status_param('trip_status', 'trip_status')}"]
            params: dict[str, Any] = {
                "trip_id": trip_id,
                "trip_status": trip_status.value,
                "assignment_status": assignment_status.value,
                "now": now,
            }
            if timestamp_field:
                fields.append(f"{timestamp_field} = :now")
            if not self._is_postgres:
                fields.append("updated_at = :now")

            row = (
                connection.execute(
                    text(
                        f"""
                        UPDATE trips
                        SET {", ".join(fields)}
                        WHERE trip_id = :trip_id
                        RETURNING {self._trip_columns}
                        """
                    ),
                    params,
                )
                .mappings()
                .first()
            )
            connection.execute(
                text(
                    f"""
                    UPDATE trip_assignments
                    SET status = {self._status_param('assignment_status', 'assignment_status')}
                    WHERE trip_id = :trip_id
                      AND status IN ('assigned', 'in_progress')
                    """
                ),
                params,
            )
        trip = _row_to_trip(row)
        return self._with_latest_assignment(trip) if trip else None

    def _transition_with_assignment_release(
        self,
        *,
        trip_id: str,
        trip_status: TripStatus,
        assignment_status: AssignmentStatus,
        timestamp_field: str | None,
        cancelled_reason: str | None = None,
        aborted_reason: str | None = None,
    ) -> dict[str, Any] | None:
        assignment = self.find_active_assignment_for_trip(trip_id)
        with self.engine.begin() as connection:
            now = _now()
            fields = [f"status = {self._status_param('trip_status', 'trip_status')}"]
            params: dict[str, Any] = {
                "trip_id": trip_id,
                "trip_status": trip_status.value,
                "assignment_status": assignment_status.value,
                "available_status": VehicleStatus.AVAILABLE.value,
                "now": now,
            }
            if timestamp_field:
                fields.append(f"{timestamp_field} = :now")
            if cancelled_reason is not None:
                fields.append("cancelled_reason = :cancelled_reason")
                params["cancelled_reason"] = cancelled_reason
            if aborted_reason is not None:
                fields.append("aborted_reason = :aborted_reason")
                params["aborted_reason"] = aborted_reason
            if not self._is_postgres:
                fields.append("updated_at = :now")

            row = (
                connection.execute(
                    text(
                        f"""
                        UPDATE trips
                        SET {", ".join(fields)}
                        WHERE trip_id = :trip_id
                        RETURNING {self._trip_columns}
                        """
                    ),
                    params,
                )
                .mappings()
                .first()
            )
            connection.execute(
                text(
                    f"""
                    UPDATE trip_assignments
                    SET status = {self._status_param('assignment_status', 'assignment_status')},
                        unassigned_at = :now
                    WHERE trip_id = :trip_id
                      AND status IN ('assigned', 'in_progress')
                    """
                ),
                params,
            )
            if assignment is not None:
                params["vehicle_id"] = assignment["vehicle_id"]
                connection.execute(
                    text(
                        f"""
                        UPDATE vehicles
                        SET status = {self._status_param('available_status', 'vehicle_status')}
                        WHERE vehicle_id = :vehicle_id
                        """
                    ),
                    params,
                )
        trip = _row_to_trip(row)
        return self._with_latest_assignment(trip) if trip else None

    def _update_trip(self, *, fields: list[str], params: dict[str, Any]) -> dict[str, Any] | None:
        with self.engine.begin() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        UPDATE trips
                        SET {", ".join(fields)}
                        WHERE trip_id = :trip_id
                        RETURNING {self._trip_columns}
                        """
                    ),
                    params,
                )
                .mappings()
                .first()
            )
        trip = _row_to_trip(row)
        return self._with_latest_assignment(trip) if trip else None

    def _status_param(self, name: str, enum_name: str) -> str:
        if self._is_postgres:
            return f"CAST(:{name} AS {enum_name})"
        return f":{name}"

    def _cast_text(self, enum_name: str) -> str:
        if self._is_postgres:
            return f"::{enum_name}::text AS status"
        return " AS status"

    def _row_to_safety_score(self, row: Any) -> dict[str, Any] | None:
        if row is None:
            return None
        score = dict(row)
        score["safety_score_id"] = str(score["safety_score_id"])
        score["trip_id"] = str(score["trip_id"])
        score["score"] = float(score["score"])
        for key in ("total_events", "warning_events", "critical_events", "alert_count"):
            score[key] = int(score[key])
        if isinstance(score.get("explanation"), str):
            score["explanation"] = json.loads(score["explanation"])
        return score

    def _row_to_monitoring_session(self, row: Any) -> dict[str, Any]:
        session = dict(row)
        session["monitoring_session_id"] = str(session["monitoring_session_id"])
        session["trip_id"] = str(session["trip_id"])
        return session
