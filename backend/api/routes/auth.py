from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth.dependencies import get_current_user
from backend.models.auth import LoginRequest, TokenResponse, UserResponse
from backend.services.user_service import (
    InactiveUserError,
    InvalidCredentialsError,
    JwtConfigurationError,
    UserService,
    public_user,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    service = UserService()
    try:
        user = service.authenticate_user(email=payload.email, password=payload.password)
        access_token, expires_in = service.create_access_token_for_user(user)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except InactiveUserError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from None
    except JwtConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from None

    return TokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        user=UserResponse(**public_user(user)),
    )


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: dict = Depends(get_current_user)) -> UserResponse:
    return UserResponse(**current_user)
