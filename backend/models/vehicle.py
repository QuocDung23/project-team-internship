from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class VehicleStatus(str, Enum):
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"


class VehicleCreate(BaseModel):
    plate_number: str = Field(..., min_length=1, max_length=30)
    vehicle_type: str | None = Field(default=None, max_length=50)
    status: VehicleStatus = VehicleStatus.AVAILABLE

    @field_validator("plate_number", mode="before")
    @classmethod
    def normalize_plate_number(cls, value: str) -> str:
        normalized = str(value).strip().upper()
        if not normalized:
            raise ValueError("plate_number is required")
        return normalized

    @field_validator("vehicle_type", mode="before")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None


class VehicleUpdate(BaseModel):
    plate_number: str | None = Field(default=None, min_length=1, max_length=30)
    vehicle_type: str | None = Field(default=None, max_length=50)
    status: VehicleStatus | None = None

    @field_validator("plate_number", mode="before")
    @classmethod
    def normalize_optional_plate_number(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().upper()
        if not normalized:
            raise ValueError("plate_number cannot be blank")
        return normalized

    @field_validator("vehicle_type", mode="before")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None


class VehicleAvailabilityUpdate(BaseModel):
    status: VehicleStatus


class VehicleResponse(BaseModel):
    vehicle_id: str
    plate_number: str
    vehicle_type: str | None = None
    status: VehicleStatus
    created_at: datetime
    updated_at: datetime


class VehicleListResponse(BaseModel):
    vehicles: list[VehicleResponse]
