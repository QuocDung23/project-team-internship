from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    DISPATCHER = "dispatcher"
    DRIVER = "driver"


def parse_role(role: UserRole | str) -> UserRole:
    try:
        return role if isinstance(role, UserRole) else UserRole(str(role).strip().lower())
    except ValueError as exc:
        raise ValueError(f"Unsupported user role: {role}") from exc
