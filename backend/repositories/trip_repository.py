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
        return trip

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
