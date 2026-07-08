from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from config.db import get_connection
from services.safety_service import calculate_safety


def start_trip(driver_id, vehicle_plate=None):

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO trips
            (driver_id,vehicle_plate,status)
            VALUES(%s,%s,'in_progress')
            RETURNING trip_id
        """, (driver_id, vehicle_plate))

        trip_id = cur.fetchone()[0]

        conn.commit()

    except Exception as exc:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=400, detail=str(exc))

    conn.close()

    return str(trip_id)


def end_trip(trip_id):

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Bug cũ: đếm cảnh báo từ bảng "detection_events" (không tồn tại trong DB).
    # Số cảnh báo đã được trigger bump_trip_alert_counters cập nhật real-time
    # ngay trên bảng trips, nên chỉ cần đọc lại từ đó.
    cur.execute("""
        SELECT total_alerts_count, critical_alerts_count, status
        FROM trips
        WHERE trip_id=%s
    """, (trip_id,))

    trip = cur.fetchone()

    if trip is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")

    total_alerts = trip["total_alerts_count"]
    critical_alerts = trip["critical_alerts_count"]

    score, grade = calculate_safety(total_alerts, critical_alerts)

    # Bug cũ: cập nhật cột "actual_end_time" (không tồn tại), cột đúng là "end_time"
    cur.execute("""
        UPDATE trips
        SET
        status='completed',
        end_time=NOW(),
        safety_score=%s,
        safety_grade=%s
        WHERE trip_id=%s
        RETURNING end_time
    """, (score, grade, trip_id))

    updated = cur.fetchone()

    conn.commit()
    conn.close()

    return {
        "trip_id": str(trip_id),
        "total_alerts": total_alerts,
        "critical_alerts": critical_alerts,
        "safety_score": score,
        "safety_grade": grade,
        "end_time": updated["end_time"]
    }


def get_trip(trip_id):

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT *
        FROM trips
        WHERE trip_id=%s
    """, (trip_id,))

    row = cur.fetchone()

    conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")

    return row


def get_trips(driver_id=None, status=None):

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    query = "SELECT * FROM trips WHERE 1=1"
    params = []

    if driver_id:
        query += " AND driver_id=%s"
        params.append(driver_id)

    if status:
        query += " AND status=%s"
        params.append(status)

    query += " ORDER BY start_time DESC"

    cur.execute(query, tuple(params))

    rows = cur.fetchall()

    conn.close()

    return rows
