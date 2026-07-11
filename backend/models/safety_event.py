from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


class SafetyEventType(str, Enum):
    DROWSINESS_DETECTED = "drowsiness_detected"
    EYES_CLOSED = "eyes_closed"
    YAWNING = "yawning"
    YAWNING_DETECTED = "yawning_detected"
    NO_FACE_DETECTED = "no_face_detected"
    HEAD_NOD = "head_nod"
    HEAD_NODDING_DETECTED = "head_nodding_detected"
    DISTRACTION = "distraction"
    CAMERA_BLOCKED = "camera_blocked"


class SafetyEventSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class SafetyEventIngestRequest(BaseModel):
    event_id: str = Field(..., min_length=1, max_length=100)
    event_type: SafetyEventType
    severity: SafetyEventSeverity
    source: str = Field(default="ai_camera", min_length=1, max_length=100)
    occurred_at: datetime
    monitoring_session_id: str | None = Field(default=None, min_length=1)
    trip_id: str | None = Field(default=None, min_length=1)
    driver_id: str | None = Field(default=None, min_length=1)
    vehicle_id: str | None = Field(default=None, min_length=1)
    confidence: float = Field(..., ge=0, le=1)
    duration_ms: int = Field(..., ge=0)
    details: dict[str, Any] = Field(default_factory=dict)

    @field_validator(
        "event_id",
        "source",
        "monitoring_session_id",
        "trip_id",
        "driver_id",
        "vehicle_id",
        mode="before",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("details")
    @classmethod
    def validate_details(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError("details must be an object")
        return value

    @field_validator("occurred_at")
    @classmethod
    def validate_occurred_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
            raise ValueError("occurred_at must include timezone information")
        return value


class SafetyEventIngestResponse(BaseModel):
    safety_event_id: str
    event_id: str
    event_type: SafetyEventType
    severity: SafetyEventSeverity
    source: str
    occurred_at: datetime
    monitoring_session_id: str | None = None
    trip_id: str | None = None
    driver_id: str | None = None
    vehicle_id: str | None = None
    confidence: float
    duration_ms: int
    details: dict[str, Any]
    alert_id: str | None = None
    created_at: datetime
