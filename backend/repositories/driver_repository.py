from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from backend.auth.roles import UserRole
from backend.db.connection import get_engine
from backend.models.driver import DriverSessionStatus, DriverStatus


DRIVER_COLUMNS = """
    driver_id,
    driver_code,
    full_name,
    license_number,
    phone,
    email,
    status::text AS status,
    baseline_ear,
    created_at,
    updated_at
"""

DRIVER_SESSION_COLUMNS = """
    driver_session_id,
    driver_id,
    status::text AS status,
    started_at,
    ended_at,
    device_label,
    notes,
    created_at
"""


def _row_to_driver(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    driver = dict(row)
    driver["driver_id"] = str(driver["driver_id"])
    driver["status"] = DriverStatus(driver["status"])
    return driver


def _row_to_session(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    session = dict(row)
    session["driver_session_id"] = str(session["driver_session_id"])
    session["driver_id"] = str(session["driver_id"])
    session["status"] = DriverSessionStatus(session["status"])
    return session


def _driver_status_to_user_status(status: Any) -> str:
    value = status.value if isinstance(status, DriverStatus) else str(status)
    return "active" if value == DriverStatus.ACTIVE.value else "inactive"


class DriverRepository:
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()
        self._driver_code_schema_ready = False

    def list_drivers(self, *, status: DriverStatus | None = None) -> list[dict[str, Any]]:
        self._ensure_driver_code_schema()
        params: dict[str, Any] = {}
        where_sql = ""
        if status is not None:
            where_sql = "WHERE status = CAST(:status AS driver_status)"
            params["status"] = status.value

        with self.engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                        SELECT {DRIVER_COLUMNS}
                        FROM drivers
                        {where_sql}
                        ORDER BY full_name, created_at DESC
                        """
                    ),
                    params,
                )
                .mappings()
                .all()
            )
        return [driver for row in rows if (driver := _row_to_driver(row)) is not None]

    def find_by_id(self, driver_id: str) -> dict[str, Any] | None:
        self._ensure_driver_code_schema()
        with self.engine.connect() as connection:
            row = self._find_by_id(connection, driver_id)
        return _row_to_driver(row)

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        self._ensure_driver_code_schema()
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {DRIVER_COLUMNS}
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
        return _row_to_driver(row)

    def email_is_taken(self, email: str) -> bool:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT 1
                        FROM users
                        WHERE lower(email) = lower(:email)
                        UNION
                        SELECT 1
                        FROM drivers
                        WHERE lower(email) = lower(:email)
                        LIMIT 1
                        """
                    ),
                    {"email": email},
                )
                .first()
            )
        return row is not None

    def create_driver(
        self,
        *,
        full_name: str,
        license_number: str,
        phone: str | None,
        email: str | None,
        status: DriverStatus,
        baseline_ear: Any,
    ) -> dict[str, Any]:
        self._ensure_driver_code_schema()
        with self.engine.begin() as connection:
            driver_code = self._next_driver_code(connection)
            row = (
                connection.execute(
                    text(
                        f"""
                        INSERT INTO drivers (
                            driver_code,
                            full_name,
                            license_number,
                            phone,
                            email,
                            status,
                            baseline_ear
                        )
                        VALUES (
                            :driver_code,
                            :full_name,
                            :license_number,
                            :phone,
                            :email,
                            CAST(:status AS driver_status),
                            :baseline_ear
                        )
                        RETURNING {DRIVER_COLUMNS}
                        """
                    ),
                    {
                        "driver_code": driver_code,
                        "full_name": full_name,
                        "license_number": license_number,
                        "phone": phone,
                        "email": email,
                        "status": status.value,
                        "baseline_ear": baseline_ear,
                    },
                )
                .mappings()
                .one()
            )
        driver = _row_to_driver(row)
        if driver is None:
            raise RuntimeError("created driver was not returned")
        return driver

    def create_driver_with_user(
        self,
        *,
        full_name: str,
        license_number: str,
        phone: str | None,
        email: str,
        status: DriverStatus,
        baseline_ear: Any,
        password_hash: str,
        user_role: UserRole = UserRole.DRIVER,
        user_status: str = "active",
    ) -> dict[str, Any]:
        self._ensure_driver_code_schema()
        with self.engine.begin() as connection:
            driver_code = self._next_driver_code(connection)
            connection.execute(
                text(
                    """
                    INSERT INTO users (full_name, email, password_hash, role, status)
                    VALUES (
                        :full_name,
                        :email,
                        :password_hash,
                        CAST(:role AS user_role),
                        CAST(:user_status AS user_status)
                    )
                    """
                ),
                {
                    "full_name": full_name,
                    "email": email,
                    "password_hash": password_hash,
                    "role": user_role.value,
                    "user_status": user_status,
                },
            )
            row = (
                connection.execute(
                    text(
                        f"""
                        INSERT INTO drivers (
                            driver_code,
                            full_name,
                            license_number,
                            phone,
                            email,
                            status,
                            baseline_ear
                        )
                        VALUES (
                            :driver_code,
                            :full_name,
                            :license_number,
                            :phone,
                            :email,
                            CAST(:status AS driver_status),
                            :baseline_ear
                        )
                        RETURNING {DRIVER_COLUMNS}
                        """
                    ),
                    {
                        "driver_code": driver_code,
                        "full_name": full_name,
                        "license_number": license_number,
                        "phone": phone,
                        "email": email,
                        "status": status.value,
                        "baseline_ear": baseline_ear,
                    },
                )
                .mappings()
                .one()
            )
        driver = _row_to_driver(row)
        if driver is None:
            raise RuntimeError("created driver was not returned")
        return driver

    def update_driver(self, driver_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        self._ensure_driver_code_schema()
        if not changes:
            return self.find_by_id(driver_id)

        assignments = []
        params: dict[str, Any] = {"driver_id": driver_id}
        for column, value in changes.items():
            if column == "status":
                assignments.append("status = CAST(:status AS driver_status)")
                params["status"] = value.value if isinstance(value, DriverStatus) else value
            else:
                assignments.append(f"{column} = :{column}")
                params[column] = value

        with self.engine.begin() as connection:
            original = self._find_by_id(connection, driver_id)
            row = (
                connection.execute(
                    text(
                        f"""
                        UPDATE drivers
                        SET {", ".join(assignments)}
                        WHERE driver_id = :driver_id
                        RETURNING {DRIVER_COLUMNS}
                        """
                    ),
                    params,
                )
                .mappings()
                .first()
            )
            if row is not None:
                self._sync_linked_user_after_driver_update(
                    connection,
                    original_email=original["email"] if original is not None else None,
                    updated_driver=row,
                    changes=changes,
                )
        return _row_to_driver(row)

    def _sync_linked_user_after_driver_update(
        self,
        connection: Connection,
        *,
        original_email: str | None,
        updated_driver: Any,
        changes: dict[str, Any],
    ) -> None:
        lookup_email = original_email or updated_driver["email"]
        if not lookup_email:
            return

        assignments = []
        params: dict[str, Any] = {"lookup_email": lookup_email}
        if "full_name" in changes:
            assignments.append("full_name = :full_name")
            params["full_name"] = updated_driver["full_name"]
        if "email" in changes and updated_driver["email"]:
            assignments.append("email = :email")
            params["email"] = updated_driver["email"]
        if "status" in changes:
            assignments.append("status = CAST(:user_status AS user_status)")
            params["user_status"] = _driver_status_to_user_status(changes["status"])
        if not assignments:
            return

        connection.execute(
            text(
                f"""
                UPDATE users
                SET {", ".join(assignments)}
                WHERE lower(email) = lower(:lookup_email)
                  AND role = CAST(:role AS user_role)
                """
            ),
            {**params, "role": UserRole.DRIVER.value},
        )

    def delete_driver(self, driver_id: str) -> bool:
        with self.engine.begin() as connection:
            result = connection.execute(
                text("DELETE FROM drivers WHERE driver_id = :driver_id"),
                {"driver_id": driver_id},
            )
        return result.rowcount > 0

    def find_active_session(self, driver_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = self._find_active_session(connection, driver_id)
        return _row_to_session(row)

    def create_session(
        self,
        *,
        driver_id: str,
        device_label: str | None,
        notes: str | None,
    ) -> dict[str, Any]:
        with self.engine.begin() as connection:
            self._lock_driver(connection, driver_id)
            row = (
                connection.execute(
                    text(
                        f"""
                        INSERT INTO driver_sessions (driver_id, device_label, notes)
                        VALUES (:driver_id, :device_label, :notes)
                        RETURNING {DRIVER_SESSION_COLUMNS}
                        """
                    ),
                    {
                        "driver_id": driver_id,
                        "device_label": device_label,
                        "notes": notes,
                    },
                )
                .mappings()
                .one()
            )
        session = _row_to_session(row)
        if session is None:
            raise RuntimeError("created driver session was not returned")
        return session

    def end_active_session(self, *, driver_id: str, notes: str | None) -> dict[str, Any] | None:
        with self.engine.begin() as connection:
            self._lock_driver(connection, driver_id)
            row = (
                connection.execute(
                    text(
                        f"""
                        UPDATE driver_sessions
                        SET status = 'ended',
                            ended_at = now(),
                            notes = COALESCE(:notes, notes)
                        WHERE driver_id = :driver_id
                          AND status = 'active'
                        RETURNING {DRIVER_SESSION_COLUMNS}
                        """
                    ),
                    {"driver_id": driver_id, "notes": notes},
                )
                .mappings()
                .first()
            )
        return _row_to_session(row)

    def list_sessions(self, driver_id: str) -> list[dict[str, Any]]:
        with self.engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                        SELECT {DRIVER_SESSION_COLUMNS}
                        FROM driver_sessions
                        WHERE driver_id = :driver_id
                        ORDER BY started_at DESC
                        """
                    ),
                    {"driver_id": driver_id},
                )
                .mappings()
                .all()
            )
        return [session for row in rows if (session := _row_to_session(row)) is not None]

    def _find_by_id(self, connection: Connection, driver_id: str) -> Any:
        return (
            connection.execute(
                text(
                    f"""
                    SELECT {DRIVER_COLUMNS}
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

    def _find_active_session(self, connection: Connection, driver_id: str) -> Any:
        return (
            connection.execute(
                text(
                    f"""
                    SELECT {DRIVER_SESSION_COLUMNS}
                    FROM driver_sessions
                    WHERE driver_id = :driver_id
                      AND status = 'active'
                    LIMIT 1
                    """
                ),
                {"driver_id": driver_id},
            )
            .mappings()
            .first()
        )

    def _lock_driver(self, connection: Connection, driver_id: str) -> None:
        connection.execute(
            text(
                """
                SELECT driver_id
                FROM drivers
                WHERE driver_id = :driver_id
                FOR UPDATE
                """
            ),
            {"driver_id": driver_id},
        ).first()

    def _next_driver_code(self, connection: Connection) -> str:
        row = connection.execute(
            text(
                """
                SELECT driver_code
                FROM drivers
                WHERE driver_code ~ '^DRV-[0-9]+$'
                ORDER BY CAST(SUBSTRING(driver_code FROM 5) AS integer) DESC
                LIMIT 1
                """
            )
        ).first()
        current = 0
        if row is not None and row[0]:
            current = int(str(row[0]).split("-")[-1])
        return f"DRV-{current + 1:03d}"

    def _ensure_driver_code_schema(self) -> None:
        if self._driver_code_schema_ready:
            return
        if self.engine.dialect.name != "postgresql":
            self._driver_code_schema_ready = True
            return
        with self.engine.begin() as connection:
            connection.execute(text("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_code VARCHAR(20)"))
            connection.execute(
                text(
                    """
                    WITH numbered AS (
                        SELECT
                            driver_id,
                            row_number() OVER (ORDER BY created_at, full_name, driver_id) AS row_num
                        FROM drivers
                    )
                    UPDATE drivers d
                    SET driver_code = 'DRV-' || lpad(numbered.row_num::text, 3, '0')
                    FROM numbered
                    WHERE d.driver_id = numbered.driver_id
                      AND d.driver_code IS NULL
                    """
                )
            )
            connection.execute(text("ALTER TABLE drivers ALTER COLUMN driver_code SET NOT NULL"))
            connection.execute(
                text(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_drivers_driver_code
                    ON drivers(driver_code)
                    """
                )
            )
        self._driver_code_schema_ready = True
