from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class DriverStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class DriverSessionStatus(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"
    EXPIRED = "expired"


class DriverCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    license_number: str = Field(..., min_length=1, max_length=50)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=150)
    status: DriverStatus = DriverStatus.ACTIVE
    baseline_ear: Decimal | None = Field(default=None, ge=0, max_digits=5, decimal_places=3)

    @field_validator("full_name", "license_number")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("value is required")
        return normalized

    @field_validator("phone", "email", mode="before")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        email = value.lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("valid email is required")
        return email


class DriverUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    license_number: str | None = Field(default=None, min_length=1, max_length=50)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=150)
    status: DriverStatus | None = None
    baseline_ear: Decimal | None = Field(default=None, ge=0, max_digits=5, decimal_places=3)

    @field_validator("full_name", "license_number", mode="before")
    @classmethod
    def strip_optional_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        if not normalized:
            raise ValueError("value cannot be blank")
        return normalized

    @field_validator("phone", "email", mode="before")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        email = value.lower()
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("valid email is required")
        return email


class DriverResponse(BaseModel):
    driver_id: str
    full_name: str
    license_number: str
    phone: str | None = None
    email: str | None = None
    status: DriverStatus
    baseline_ear: Decimal | None = None
    created_at: datetime
    updated_at: datetime


class DriverListResponse(BaseModel):
    drivers: list[DriverResponse]


class DriverCheckInRequest(BaseModel):
    device_label: str | None = Field(default=None, max_length=100)
    notes: str | None = None

    @field_validator("device_label", "notes", mode="before")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None


class DriverCheckOutRequest(BaseModel):
    notes: str | None = None

    @field_validator("notes", mode="before")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None


class DriverSessionResponse(BaseModel):
    driver_session_id: str
    driver_id: str
    status: DriverSessionStatus
    started_at: datetime
    ended_at: datetime | None = None
    device_label: str | None = None
    notes: str | None = None
    created_at: datetime


class DriverSessionListResponse(BaseModel):
    sessions: list[DriverSessionResponse]
