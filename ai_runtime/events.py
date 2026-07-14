from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_safety_event(
    event_type: str,
    severity: str,
    confidence: float,
    duration_ms: int = 0,
    trip_id: str | None = None,
    monitoring_session_id: str | None = None,
    driver_id: str | None = None,
    vehicle_id: str | None = None,
    source: str = "ai_camera",
    details: dict | None = None,
) -> dict:
    return {
        "event_id": str(uuid4()),
        "event_type": event_type,
        "severity": severity,
        "source": source,
        "occurred_at": utc_now_iso(),
        "monitoring_session_id": monitoring_session_id,
        "trip_id": trip_id,
        "driver_id": driver_id,
        "vehicle_id": vehicle_id,
        "confidence": round(float(confidence), 2),
        "duration_ms": int(duration_ms),
        "details": details or {},
    }
