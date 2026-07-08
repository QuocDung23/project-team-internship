from typing import Optional

from pydantic import BaseModel


class DriverCreate(BaseModel):

    full_name: str
    license_number: str
    phone: Optional[str] = None
    email: Optional[str] = None
    status: str = "active"


class AlertCreate(BaseModel):

    trip_id: str
    alert_type: str
    method: str #Phương pháp phát hiện (ear_dlib, cnn_classifier, manual)
    severity: str = "warning"

    # Riêng cho phương pháp EAR (dlib)
    ear_value: Optional[float] = None
    consecutive_frame_count: Optional[int] = None

    # Riêng cho phương pháp CNN
    cnn_confidence: Optional[float] = None
    cnn_label: Optional[str] = None


class TripStart(BaseModel):

    driver_id: str
    vehicle_plate: Optional[str] = None


class SettingUpdate(BaseModel):

    ear_threshold: float
    frame_threshold: int
    cnn_confidence_threshold: Optional[float] = 0.80
    mar_threshold: Optional[float] = None  # chưa có cột riêng trong DB, được lưu vào extra_config (JSONB)
