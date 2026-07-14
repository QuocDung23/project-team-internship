from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.auth.jwt import TokenError, decode_access_token
from backend.auth.roles import UserRole
from backend.core.settings import get_settings
from backend.repositories.user_repository import UserRepository
from backend.services.user_service import public_user


bearer_scheme = HTTPBearer(auto_error=False)


def credentials_error(detail: str = "Could not validate credentials.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise credentials_error("Missing bearer token.")

    settings = get_settings()
    try:
        payload = decode_access_token(
            credentials.credentials,
            secret=settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )
    except TokenError:
        raise credentials_error() from None

    user = UserRepository().find_by_id(str(payload["sub"]))
    if user is None:
        raise credentials_error()
    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )
    return public_user(user)


def require_roles(*allowed_roles: UserRole) -> Callable[[dict], dict]:
    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return current_user

    return dependency
