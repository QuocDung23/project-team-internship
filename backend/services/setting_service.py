from config.db import get_connection


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


def _row_to_setting(row):
    if row is None:
        return None
    return {key: value for key, value in zip(SETTING_COLUMNS, row)}


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

    merged={key: current[key] for key in UPDATABLE_COLUMNS}
    for key, value in (changes or {}).items():
        if key in merged and value is not None:
            merged[key]=value

    conn=get_connection()
    cur=conn.cursor()
    assignments=", ".join(f"{key}=%s" for key in UPDATABLE_COLUMNS)
    values=[merged[key] for key in UPDATABLE_COLUMNS]
    cur.execute(f"""
        UPDATE settings
        SET {assignments}, updated_at=NOW()
        WHERE scope='global'
    """, values)
    conn.commit()
    conn.close()

    return get_global_settings()
