from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from backend.auth.roles import UserRole, parse_role
from backend.db.connection import get_engine


USER_COLUMNS = """
    user_id,
    full_name,
    email,
    password_hash,
    role::text AS role,
    status::text AS status,
    created_at,
    updated_at
"""


def _row_to_user(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    user = dict(row)
    user["user_id"] = str(user["user_id"])
    user["role"] = parse_role(user["role"])
    return user


class UserRepository:
    def __init__(self, engine: Engine | None = None):
        self.engine = engine or get_engine()

    def find_by_email(self, email: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {USER_COLUMNS}
                        FROM users
                        WHERE lower(email) = lower(:email)
                        LIMIT 1
                        """
                    ),
                    {"email": email},
                )
                .mappings()
                .first()
            )
        return _row_to_user(row)

    def find_by_id(self, user_id: str) -> dict[str, Any] | None:
        with self.engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {USER_COLUMNS}
                        FROM users
                        WHERE user_id = :user_id
                        LIMIT 1
                        """
                    ),
                    {"user_id": user_id},
                )
                .mappings()
                .first()
            )
        return _row_to_user(row)

    def create_user(
        self,
        *,
        full_name: str,
        email: str,
        password_hash: str,
        role: UserRole,
        status: str = "active",
    ) -> dict[str, Any]:
        user_role = parse_role(role)
        with self.engine.begin() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        INSERT INTO users (full_name, email, password_hash, role, status)
                        VALUES (
                            :full_name,
                            :email,
                            :password_hash,
                            CAST(:role AS user_role),
                            CAST(:status AS user_status)
                        )
                        RETURNING {USER_COLUMNS}
                        """
                    ),
                    {
                        "full_name": full_name,
                        "email": email,
                        "password_hash": password_hash,
                        "role": user_role.value,
                        "status": status,
                    },
                )
                .mappings()
                .one()
            )
        user = _row_to_user(row)
        if user is None:
            raise RuntimeError("created user was not returned")
        return user

    def update_password_hash(self, *, email: str, password_hash: str) -> dict[str, Any] | None:
        with self.engine.begin() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        UPDATE users
                        SET password_hash = :password_hash,
                            updated_at = now()
                        WHERE lower(email) = lower(:email)
                        RETURNING {USER_COLUMNS}
                        """
                    ),
                    {"email": email, "password_hash": password_hash},
                )
                .mappings()
                .first()
            )
        return _row_to_user(row)
