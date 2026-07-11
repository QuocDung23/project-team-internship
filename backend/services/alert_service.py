from backend.config.db import get_connection


ALERT_COLUMNS = (
    "alert_id",
    "trip_id",
    "driver_id",
    "alert_type",
    "severity",
    "detection_method",
    "ear_value",
    "consecutive_frame_count",
    "cnn_confidence",
    "cnn_label",
    "captured_frame_path",
    "latitude",
    "longitude",
    "alarm_triggered",
    "alarm_audio_file",
    "acknowledged",
    "acknowledged_at",
    "occurred_at",
    "created_at",
)


def _row_to_alert(row):
    if row is None:
        return None
    return {key: value for key, value in zip(ALERT_COLUMNS, row)}


def create_alert(
    trip_id:str,
    alert_type:str,
    detection_method:str=None,
    method:str=None,
    severity:str="warning",
    ear_value:float=None,
    consecutive_frame_count:int=None,
    cnn_confidence:float=None,
    cnn_label:str=None,
    alarm_triggered:bool=False,
    captured_frame_path:str=None,
    latitude:float=None,
    longitude:float=None,
    alarm_audio_file:str=None
):
    detection_method = detection_method or method
    if not detection_method:
        raise ValueError("detection_method is required")
    canonical_type = _canonical_alert_type(alert_type)
    canonical_severity = "critical" if severity in {"critical", "high"} else "warning"

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT
            ta.driver_id,
            ta.vehicle_id
        FROM trips t
        LEFT JOIN trip_assignments ta
            ON ta.trip_id = t.trip_id
            AND ta.status IN ('assigned', 'in_progress')
        WHERE t.trip_id=%s
        LIMIT 1
    """,(trip_id,))

    trip=cur.fetchone()
    if trip is None:
        conn.close()
        raise ValueError("trip_id not found")

    driver_id=trip[0]
    vehicle_id=trip[1]

    cur.execute("""
        INSERT INTO alerts
        (
            trip_id,
            driver_id,
            vehicle_id,
            severity,
            alert_type,
            title,
            message
        )
        VALUES(%s,%s,%s,%s,%s,%s,%s)
        RETURNING alert_id
    """,(
        trip_id,
        driver_id,
        vehicle_id,
        canonical_severity,
        canonical_type,
        f"Legacy {canonical_type.replace('_', ' ')} alert",
        (
            f"Legacy detector alert via {detection_method}; "
            f"EAR={ear_value}, frames={consecutive_frame_count}, "
            f"CNN={cnn_label}:{cnn_confidence}, alarm={alarm_triggered}."
        ),
    ))

    alert_id=cur.fetchone()[0]

    conn.commit()
    conn.close()

    return str(alert_id)


def get_trip_alerts(
    trip_id:str
):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT
            a.alert_id,
            a.trip_id,
            a.driver_id,
            a.alert_type,
            a.severity,
            COALESCE(se.detection_method::text, se.source, 'backend'),
            se.ear_value,
            NULL::integer,
            se.cnn_confidence,
            se.cnn_label,
            se.evidence_frame_path,
            NULL::numeric,
            NULL::numeric,
            CASE WHEN a.severity = 'critical' THEN TRUE ELSE FALSE END,
            NULL::text,
            CASE WHEN a.status IN ('acknowledged', 'resolved') THEN TRUE ELSE FALSE END,
            a.acknowledged_at,
            COALESCE(se.occurred_at, a.opened_at),
            a.created_at
        FROM alerts a
        LEFT JOIN alert_safety_events ase ON ase.alert_id = a.alert_id
        LEFT JOIN safety_events se ON se.safety_event_id = ase.safety_event_id
        WHERE a.trip_id=%s
        ORDER BY COALESCE(se.occurred_at, a.opened_at) DESC
    """,(trip_id,))

    rows=cur.fetchall()

    conn.close()

    return [_row_to_alert(row) for row in rows]


def _canonical_alert_type(alert_type: str) -> str:
    if alert_type in {"camera_issue", "no_face_detected", "camera_blocked"}:
        return "camera_issue"
    if alert_type in {"driver_inattention", "head_nod", "head_nodding_detected", "distraction"}:
        return "driver_inattention"
    if alert_type in {"system", "manual_review"}:
        return alert_type
    return "drowsiness"
