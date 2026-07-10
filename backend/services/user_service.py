from datetime import timedelta
from typing import Any

from backend.auth.jwt import create_access_token
from backend.auth.password import hash_password, verify_password
from backend.auth.roles import UserRole
from backend.core.settings import get_settings
from backend.models.auth import UserCreate
from backend.repositories.user_repository import UserRepository


class InvalidCredentialsError(Exception):
    """Raised when login credentials do not match any active password."""


class InactiveUserError(Exception):
    """Raised when a known user is not allowed to authenticate."""


class JwtConfigurationError(Exception):
    """Raised when JWT signing cannot be performed safely."""


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in user.items() if key != "password_hash"}


class UserService:
    def __init__(self, user_repository: UserRepository | None = None):
        self.user_repository = user_repository or UserRepository()

    def authenticate_user(self, *, email: str, password: str) -> dict[str, Any]:
        user = self.user_repository.find_by_email(email)
        if user is None or not verify_password(password, user.get("password_hash")):
            raise InvalidCredentialsError("Invalid email or password.")
        if user.get("status") != "active":
            raise InactiveUserError("User account is inactive.")
        return user

    def create_access_token_for_user(self, user: dict[str, Any]) -> tuple[str, int]:
        settings = get_settings()
        if not settings.jwt_secret:
            raise JwtConfigurationError("JWT secret is not configured.")

        expires_in = settings.access_token_expire_minutes * 60
        token = create_access_token(
            subject=user["user_id"],
            role=user["role"].value if isinstance(user["role"], UserRole) else str(user["role"]),
            secret=settings.jwt_secret,
            expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
            algorithm=settings.jwt_algorithm,
        )
        return token, expires_in

    def create_user(self, user_data: UserCreate) -> dict[str, Any]:
        password_hash = hash_password(user_data.password)
        return self.user_repository.create_user(
            full_name=user_data.full_name,
            email=user_data.email,
            password_hash=password_hash,
            role=user_data.role,
            status=user_data.status,
        )

    def set_user_password(self, *, email: str, password: str) -> dict[str, Any] | None:
        if len(password) < 12:
            raise ValueError("password must be at least 12 characters")
        return self.user_repository.update_password_hash(
            email=email,
            password_hash=hash_password(password),
        )
