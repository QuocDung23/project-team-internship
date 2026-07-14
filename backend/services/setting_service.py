import json

from backend.config.db import get_connection


DEFAULT_ALARM_SOUND_ID = "classic"
ALARM_SOUND_CATALOG = {
    "classic": {
        "label": "Classic alarm",
        "runtime_path": "audio/alert.wav",
        "browser_path": "/alert.wav",
    },
    "soft": {
        "label": "Soft chime",
        "runtime_path": "audio/alert-soft.wav",
        "browser_path": "/alert-soft.wav",
    },
    "urgent": {
        "label": "Urgent pulse",
        "runtime_path": "audio/alert-urgent.wav",
        "browser_path": "/alert-urgent.wav",
    },
}
SUPPORTED_UPDATE_FIELDS = {
    "alarm_sound_id",
    "frame_width",
    "frame_height",
    "safety_grade_a_min_score",
    "safety_grade_b_min_score",
}

SETTING_COLUMNS = (
    "setting_id",
    "scope",
    "driver_id",
    "ear_threshold",
    "ear_consec_frames",
    "cnn_confidence_threshold",
    "preferred_detection_method",
    "alarm_audio_file",
    "alert_cooldown_seconds",
    "enable_no_face_alert",
    "no_face_timeout_seconds",
    "camera_index",
    "frame_width",
    "frame_height",
    "warning_alert_penalty",
    "critical_alert_penalty",
    "safety_grade_a_min_score",
    "safety_grade_b_min_score",
    "extra_config",
)


UPDATABLE_COLUMNS = SETTING_COLUMNS[3:]


def _sound_id_from_setting(setting):
    extra = setting.get("extra_config") if isinstance(setting, dict) else None
    if isinstance(extra, str):
        try:
            extra = json.loads(extra)
            setting["extra_config"] = extra
        except json.JSONDecodeError:
            extra = None
    if isinstance(extra, dict):
        sound_id = str(extra.get("alarm_sound_id") or "").strip()
        if sound_id in ALARM_SOUND_CATALOG:
            return sound_id

    legacy_file = str(setting.get("alarm_audio_file") or "").strip()
    for sound_id, sound in ALARM_SOUND_CATALOG.items():
        if legacy_file in {sound["runtime_path"], sound["runtime_path"].replace("audio/", "")}:
            return sound_id
    return DEFAULT_ALARM_SOUND_ID


def _apply_sound_fields(setting):
    sound_id = _sound_id_from_setting(setting)
    sound = ALARM_SOUND_CATALOG[sound_id]
    setting["alarm_sound_id"] = sound_id
    setting["alarm_audio_file"] = sound["runtime_path"]
    setting["warning_alert_penalty"] = 5
    setting["critical_alert_penalty"] = 10
    if setting.get("safety_grade_a_min_score") is None:
        setting["safety_grade_a_min_score"] = 80
    if setting.get("safety_grade_b_min_score") is None:
        setting["safety_grade_b_min_score"] = 60
    setting["alarm_sound_catalog"] = [
        {"id": key, **value}
        for key, value in ALARM_SOUND_CATALOG.items()
    ]
    return setting


def _row_to_setting(row):
    if row is None:
        return None
    return _apply_sound_fields({key: value for key, value in zip(SETTING_COLUMNS, row)})


def _positive_int(value, field):
    if isinstance(value, bool):
        raise ValueError(f"{field} must be a positive integer")
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be a positive integer") from exc
    if parsed <= 0 or parsed != value and isinstance(value, float):
        raise ValueError(f"{field} must be a positive integer")
    return parsed


def _score_cutoff(value, field):
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be between 0 and 100") from exc
    if parsed < 0 or parsed > 100:
        raise ValueError(f"{field} must be between 0 and 100")
    return parsed


def get_global_settings():
    conn=get_connection()
    cur=conn.cursor()
    cur.execute(f"""
        SELECT {", ".join(SETTING_COLUMNS)}
        FROM settings
        WHERE scope='global'
        LIMIT 1
    """)
    row=cur.fetchone()
    conn.close()
    return _row_to_setting(row)


def update_global_settings(changes):
    current=get_global_settings()
    if current is None:
        raise ValueError("global settings not found")

    unsupported = sorted(set(changes or {}) - SUPPORTED_UPDATE_FIELDS)
    if unsupported:
        raise ValueError(f"unsupported settings fields: {', '.join(unsupported)}")

    merged={key: current[key] for key in UPDATABLE_COLUMNS}
    for key, value in (changes or {}).items():
        if value is None:
            continue
        if key in {"frame_width", "frame_height"}:
            merged[key] = _positive_int(value, key)
        elif key in {"safety_grade_a_min_score", "safety_grade_b_min_score"}:
            merged[key] = _score_cutoff(value, key)
        elif key == "alarm_sound_id":
            sound_id = str(value).strip()
            if sound_id not in ALARM_SOUND_CATALOG:
                raise ValueError("alarm_sound_id is not supported")
            extra = dict(current.get("extra_config") or {})
            extra["alarm_sound_id"] = sound_id
            merged["extra_config"] = extra
            merged["alarm_audio_file"] = ALARM_SOUND_CATALOG[sound_id]["runtime_path"]

    grade_a = _score_cutoff(merged["safety_grade_a_min_score"], "safety_grade_a_min_score")
    grade_b = _score_cutoff(merged["safety_grade_b_min_score"], "safety_grade_b_min_score")
    if grade_a < grade_b:
        raise ValueError("safety_grade_a_min_score must be greater than or equal to safety_grade_b_min_score")

    conn=get_connection()
    cur=conn.cursor()
    assignments=", ".join(f"{key}=%s" for key in UPDATABLE_COLUMNS)
    values=[
        json.dumps(merged[key]) if key == "extra_config" and isinstance(merged[key], dict) else merged[key]
        for key in UPDATABLE_COLUMNS
    ]
    cur.execute(f"""
        UPDATE settings
        SET {assignments}, updated_at=NOW()
        WHERE scope='global'
    """, values)
    conn.commit()
    conn.close()

    return get_global_settings()
