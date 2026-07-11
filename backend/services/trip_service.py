from backend.config.db import get_connection
from backend.services.safety_service import calculate_safety_score, safety_grade


TRIP_COLUMNS = (
    "trip_id",
    "driver_id",
    "driver_name",
    "vehicle_plate",
    "start_time",
    "end_time",
    "status",
    "total_alerts_count",
    "critical_alerts_count",
    "avg_drowsiness_score",
    "safety_score",
    "safety_grade",
    "notes",
    "created_at",
    "updated_at",
)


def _row_to_trip(row):
    if row is None:
        return None
    return {key: value for key, value in zip(TRIP_COLUMNS, row)}


def _trip_select(where_sql="", order_sql="ORDER BY t.start_time DESC", limit_sql=""):
    return f"""
        SELECT
            t.trip_id,
            t.driver_id,
            d.full_name AS driver_name,
            t.vehicle_plate,
            t.start_time,
            t.end_time,
            t.status,
            t.total_alerts_count,
            t.critical_alerts_count,
            t.avg_drowsiness_score,
            t.safety_score,
            t.safety_grade,
            t.notes,
            t.created_at,
            t.updated_at
        FROM trips t
        JOIN drivers d ON d.driver_id = t.driver_id
        {where_sql}
        {order_sql}
        {limit_sql}
    """


def start_trip(driver_id, vehicle_plate=None):
    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        INSERT INTO trips
        (driver_id, vehicle_plate, status)
        VALUES(%s, %s, 'in_progress')
        RETURNING trip_id
    """,(driver_id, vehicle_plate))

    trip_id=cur.fetchone()[0]

    conn.commit()
    conn.close()

    return str(trip_id)


def end_trip(trip_id):
    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT
            COUNT(*) AS total_alerts,
            COUNT(*) FILTER (WHERE severity = 'critical') AS critical_alerts
        FROM alerts
        WHERE trip_id=%s
    """,(trip_id,))

    count_row=cur.fetchone()
    count=int(count_row[0] or 0)
    critical_count=int(count_row[1] or 0)
    score=calculate_safety_score(count, critical_count)
    grade=safety_grade(score)

    cur.execute("""
        UPDATE trips
        SET
            status='completed',
            end_time=NOW(),
            safety_score=%s,
            safety_grade=%s,
            updated_at=NOW()
        WHERE trip_id=%s
    """,(score, grade, trip_id))

    conn.commit()
    conn.close()

    return {
        "trip_id":str(trip_id),
        "alerts":count,
        "critical_alerts":critical_count,
        "safety_score":score,
        "safety_grade":grade
    }


def get_trips(status=None):
    conn=get_connection()
    cur=conn.cursor()
    if status:
        cur.execute(_trip_select("WHERE t.status=%s"), (status,))
    else:
        cur.execute(_trip_select())
    rows=cur.fetchall()
    conn.close()
    return [_row_to_trip(row) for row in rows]


def get_active_trips():
    return get_trips(status="in_progress")


def get_trip(trip_id):
    conn=get_connection()
    cur=conn.cursor()
    cur.execute(_trip_select("WHERE t.trip_id=%s", limit_sql="LIMIT 1"), (trip_id,))
    row=cur.fetchone()
    conn.close()
    return _row_to_trip(row)


def get_trip_settings(trip_id):
    conn=get_connection()
    cur=conn.cursor()
    cur.execute("""
        SELECT
            s.ear_threshold,
            s.ear_consec_frames,
            s.cnn_confidence_threshold,
            s.preferred_detection_method,
            s.alarm_audio_file,
            s.alert_cooldown_seconds
        FROM trips t
        JOIN effective_driver_settings s ON s.driver_id = t.driver_id
        WHERE t.trip_id=%s
        LIMIT 1
    """,(trip_id,))
    row=cur.fetchone()
    conn.close()
    if row is None:
        return None
    keys=(
        "ear_threshold",
        "ear_consec_frames",
        "cnn_confidence_threshold",
        "preferred_detection_method",
        "alarm_audio_file",
        "alert_cooldown_seconds",
    )
    return {key: value for key, value in zip(keys, row)}
