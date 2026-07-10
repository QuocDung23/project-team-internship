from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from backend.db.connection import get_engine
from backend.models.vehicle import VehicleStatus


ACTIVE_ASSIGNMENT_STATUSES = ("assigned", "in_progress")

VEHICLE_COLUMNS = """
    vehicle_id,
    plate_number,
    vehicle_type,
    status::text AS status,
    created_at,
    updated_at
"""


def _row_to_vehicle(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    vehicle = dict(row)
    vehicle["vehicle_id"] = str(vehicle["vehicle_id"])
    vehicle["status"] = VehicleStatus(vehicle["status"])
    return vehicle


class VehicleRepository:
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()

    def list_vehicles(self, *, status: VehicleStatus | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {}
        where_sql = ""
        if status is not None:
            where_sql = "WHERE status = CAST(:status AS vehicle_status)"
            params["status"] = status.value

        with self.engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                        SELECT {VEHICLE_COLUMNS}
                        FROM vehicles
                        {where_sql}
                        ORDER BY plate_number, created_at DESC
                        """
                    ),
                    params,
                )
                .mappings()
                .all()
            )
        return [vehicle for row in rows if (vehicle := _row_to_vehicle(row)) is not None]

    def find_by_id(self, vehicle_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {VEHICLE_COLUMNS}
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
        return _row_to_vehicle(row)

    def find_by_plate_number(self, plate_number: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {VEHICLE_COLUMNS}
                        FROM vehicles
                        WHERE upper(plate_number) = upper(:plate_number)
                        LIMIT 1
                        """
                    ),
                    {"plate_number": plate_number},
                )
                .mappings()
                .first()
            )
        return _row_to_vehicle(row)

    def create_vehicle(
        self,
        *,
        plate_number: str,
        vehicle_type: str | None,
        status: VehicleStatus,
    ) -> dict[str, Any]:
        with self.engine.begin() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        INSERT INTO vehicles (plate_number, vehicle_type, status)
                        VALUES (:plate_number, :vehicle_type, CAST(:status AS vehicle_status))
                        RETURNING {VEHICLE_COLUMNS}
                        """
                    ),
                    {
                        "plate_number": plate_number,
                        "vehicle_type": vehicle_type,
                        "status": status.value,
                    },
                )
                .mappings()
                .one()
            )
        vehicle = _row_to_vehicle(row)
        if vehicle is None:
            raise RuntimeError("created vehicle was not returned")
        return vehicle

    def update_vehicle(self, vehicle_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        if not changes:
            return self.find_by_id(vehicle_id)

        assignments = []
        params: dict[str, Any] = {"vehicle_id": vehicle_id}
        for column, value in changes.items():
            if column == "status":
                assignments.append("status = CAST(:status AS vehicle_status)")
                params["status"] = value.value if isinstance(value, VehicleStatus) else value
            else:
                assignments.append(f"{column} = :{column}")
                params[column] = value

        with self.engine.begin() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        UPDATE vehicles
                        SET {", ".join(assignments)}
                        WHERE vehicle_id = :vehicle_id
                        RETURNING {VEHICLE_COLUMNS}
                        """
                    ),
                    params,
                )
                .mappings()
                .first()
            )
        return _row_to_vehicle(row)

    def delete_vehicle(self, vehicle_id: str) -> bool:
        with self.engine.begin() as connection:
            result = connection.execute(
                text("DELETE FROM vehicles WHERE vehicle_id = :vehicle_id"),
                {"vehicle_id": vehicle_id},
            )
        return result.rowcount > 0

    def has_active_assignment(self, vehicle_id: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT 1
                        FROM trip_assignments
                        WHERE vehicle_id = :vehicle_id
                          AND status IN ('assigned', 'in_progress')
                        LIMIT 1
                        """
                    ),
                    {"vehicle_id": vehicle_id},
                )
                .mappings()
                .first()
            )
        return row is not None

    def driver_has_active_assignment(self, *, vehicle_id: str, driver_email: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT 1
                        FROM trip_assignments ta
                        JOIN drivers d ON d.driver_id = ta.driver_id
                        WHERE ta.vehicle_id = :vehicle_id
                          AND ta.status IN ('assigned', 'in_progress')
                          AND lower(d.email) = lower(:driver_email)
                        LIMIT 1
                        """
                    ),
                    {"vehicle_id": vehicle_id, "driver_email": driver_email},
                )
                .mappings()
                .first()
            )
        return row is not None
