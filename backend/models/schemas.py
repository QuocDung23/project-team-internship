from typing import Any, Dict, Optional

from pydantic import BaseModel, root_validator


class DriverCreate(BaseModel):

    full_name:str
    license_number:str
    phone:Optional[str]=None
    email:Optional[str]=None
    status:str="active"


class AlertCreate(BaseModel):

    trip_id:str
    alert_type:str
    detection_method:Optional[str]=None
    method:Optional[str]=None
    severity:str="warning"
    ear_value:Optional[float]=None
    consecutive_frame_count:Optional[int]=None
    cnn_confidence:Optional[float]=None
    cnn_label:Optional[str]=None
    alarm_triggered:bool=False
    captured_frame_path:Optional[str]=None
    latitude:Optional[float]=None
    longitude:Optional[float]=None
    alarm_audio_file:Optional[str]=None

    @root_validator(pre=True)
    def _legacy_method_alias(cls, values):
        if not values.get("detection_method") and values.get("method"):
            values["detection_method"] = values["method"]
        return values


class TripStart(BaseModel):

    driver_id:str
    vehicle_plate:Optional[str]=None


class SettingUpdate(BaseModel):

    alarm_sound_id:Optional[str]=None
    ear_threshold:Optional[float]=None
    ear_consec_frames:Optional[int]=None
    cnn_confidence_threshold:Optional[float]=None
    preferred_detection_method:Optional[str]=None
    alarm_audio_file:Optional[str]=None
    alert_cooldown_seconds:Optional[int]=None
    enable_no_face_alert:Optional[bool]=None
    no_face_timeout_seconds:Optional[int]=None
    camera_index:Optional[int]=None
    frame_width:Optional[int]=None
    frame_height:Optional[int]=None
    warning_alert_penalty:Optional[float]=None
    critical_alert_penalty:Optional[float]=None
    safety_grade_a_min_score:Optional[float]=None
    safety_grade_b_min_score:Optional[float]=None
    extra_config:Optional[Dict[str, Any]]=None


class MonitoringSnapshot(BaseModel):

    trip_id:Optional[str]=None
    timestamp:float
    fps:Optional[float]=None
    ear:float
    mar:float
    pitch:float
    dws_score:int
    eyes_open:bool
    mouth_closed:bool
    face_detected:bool=True
    ear_alert:bool=False
    mar_alert:bool=False
    pose_alert:bool=False
    alarm_on:bool=False
    ear_counter:int=0
    mar_counter:int=0
    pose_counter:int=0
    ear_threshold:Optional[float]=None
    mar_threshold:Optional[float]=None
    pitch_delta_threshold:Optional[float]=None
    cnn_confidence:Optional[float]=None
    cnn_enabled:bool=False
    frame_jpeg_base64:Optional[str]=None
