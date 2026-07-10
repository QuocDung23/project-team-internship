from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from backend.auth.roles import UserRole


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=1, max_length=256)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("valid email is required")
        return email


class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    email: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=12, max_length=256)
    role: UserRole = UserRole.DISPATCHER
    status: str = "active"

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        full_name = value.strip()
        if not full_name:
            raise ValueError("full_name is required")
        return full_name

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("valid email is required")
        return email

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        status = value.strip().lower()
        if status not in {"active", "inactive"}:
            raise ValueError("status must be active or inactive")
        return status


class UserResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: UserRole
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
