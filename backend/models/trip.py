from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator


class TripStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ABORTED = "aborted"


class AssignmentStatus(str, Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RELEASED = "released"


class TripCreate(BaseModel):
    code: str | None = Field(default=None, max_length=50)
    status: TripStatus = TripStatus.DRAFT
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    origin: str | None = None
    destination: str | None = None

    @field_validator("code", "origin", "destination", mode="before")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_creation_status_and_times(self) -> "TripCreate":
        if self.status not in {TripStatus.DRAFT, TripStatus.SCHEDULED}:
            raise ValueError("trip can only be created as draft or scheduled")
        if (
            self.planned_start_at is not None
            and self.planned_end_at is not None
            and self.planned_end_at < self.planned_start_at
        ):
            raise ValueError("planned_end_at must be greater than or equal to planned_start_at")
        return self


class StartMyTripRequest(BaseModel):
    code: str | None = Field(default=None, max_length=50)
    vehicle_id: str | None = Field(default=None, min_length=1)
    origin: str | None = None
    destination: str | None = None

    @field_validator("code", "vehicle_id", "origin", "destination", mode="before")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None


class TripAssignRequest(BaseModel):
    driver_id: str = Field(..., min_length=1)
    vehicle_id: str = Field(..., min_length=1)

    @field_validator("driver_id", "vehicle_id", mode="before")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        normalized = str(value).strip()
        if not normalized:
            raise ValueError("value is required")
        return normalized


class TripCancelRequest(BaseModel):
    reason: str = Field(..., min_length=1)

    @field_validator("reason", mode="before")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        normalized = str(value).strip()
        if not normalized:
            raise ValueError("reason is required")
        return normalized


class TripAbortRequest(BaseModel):
    reason: str = Field(..., min_length=1)

    @field_validator("reason", mode="before")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        normalized = str(value).strip()
        if not normalized:
            raise ValueError("reason is required")
        return normalized


class TripAssignmentResponse(BaseModel):
    trip_assignment_id: str
    trip_id: str
    driver_id: str
    vehicle_id: str
    status: AssignmentStatus
    assigned_at: datetime
    unassigned_at: datetime | None = None
    created_at: datetime


class MonitoringSessionResponse(BaseModel):
    monitoring_session_id: str
    trip_id: str
    status: str
    detector_instance_id: str | None = None
    camera_index: int | None = None
    started_at: datetime
    ended_at: datetime | None = None
    last_snapshot_at: datetime | None = None
    created_at: datetime


class TripResponse(BaseModel):
    trip_id: str
    code: str | None = None
    status: TripStatus
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    actual_start_at: datetime | None = None
    actual_end_at: datetime | None = None
    origin: str | None = None
    destination: str | None = None
    cancelled_reason: str | None = None
    aborted_reason: str | None = None
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime
    assignment: TripAssignmentResponse | None = None
    monitoring_session: MonitoringSessionResponse | None = None
    safety_score: "SafetyScoreResponse | None" = None
    total_alerts_count: int = 0
    critical_alerts_count: int = 0


class TripListResponse(BaseModel):
    trips: list[TripResponse]


class SafetyScoreResponse(BaseModel):
    safety_score_id: str
    trip_id: str
    score: float
    grade: str
    total_events: int
    warning_events: int
    critical_events: int
    alert_count: int
    calculation_version: str
    explanation: dict
    calculated_at: datetime
