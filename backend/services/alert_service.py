from config.db import get_connection


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

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT driver_id
        FROM trips
        WHERE trip_id=%s
    """,(trip_id,))

    trip=cur.fetchone()
    if trip is None:
        conn.close()
        raise ValueError("trip_id not found")

    driver_id=trip[0]

    cur.execute("""
        INSERT INTO alerts
        (
            trip_id,
            driver_id,
            alert_type,
            severity,
            detection_method,
            ear_value,
            consecutive_frame_count,
            cnn_confidence,
            cnn_label,
            captured_frame_path,
            latitude,
            longitude,
            alarm_triggered,
            alarm_audio_file
        )
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING alert_id
    """,(
        trip_id,
        driver_id,
        alert_type,
        severity,
        detection_method,
        ear_value,
        consecutive_frame_count,
        cnn_confidence,
        cnn_label,
        captured_frame_path,
        latitude,
        longitude,
        alarm_triggered,
        alarm_audio_file
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
        alert_id,
        trip_id,
        driver_id,
        alert_type,
        severity,
        detection_method,
        ear_value,
        consecutive_frame_count,
        cnn_confidence,
        cnn_label,
        captured_frame_path,
        latitude,
        longitude,
        alarm_triggered,
        alarm_audio_file,
        acknowledged,
        acknowledged_at,
        occurred_at,
        created_at
        FROM alerts
        WHERE trip_id=%s
        ORDER BY occurred_at DESC
    """,(trip_id,))

    rows=cur.fetchall()

    conn.close()

    return [_row_to_alert(row) for row in rows]
