from typing import Optional

from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from config.db import get_connection


def create_alert(
    trip_id: str,
    alert_type: str,
    method: str,
    severity: str = "warning",
    ear_value: Optional[float] = None,
    consecutive_frame_count: Optional[int] = None,
    cnn_confidence: Optional[float] = None,
    cnn_label: Optional[str] = None
):

    conn = get_connection()
    cur = conn.cursor()

    # Bug cũ: INSERT vào bảng "detection_events" (không tồn tại) và thiếu
    # cột driver_id bắt buộc (NOT NULL) của bảng "alerts" -> lấy driver_id
    # từ chuyến đi tương ứng.
    cur.execute("""
        SELECT driver_id
        FROM trips
        WHERE trip_id=%s
    """, (trip_id,))

    trip = cur.fetchone()

    if trip is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến đi")

    driver_id = trip[0]

    try:
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
                alarm_triggered
            )
            VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING alert_id
        """, (
            trip_id,
            driver_id,
            alert_type,
            severity,
            method,
            ear_value,
            consecutive_frame_count,
            cnn_confidence,
            cnn_label,
            severity == "critical"
        ))

        event_id = cur.fetchone()[0]

        conn.commit()

    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    finally:
        conn.close()

    return str(event_id)


def get_trip_alerts(
    trip_id: str
):

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Bug cũ: SELECT từ bảng "detection_events" (không tồn tại), cột
    # "event_id"/"created_at" cũng sai tên -> đổi thành bảng/cột đúng "alerts"
    # với "alert_id"/"occurred_at".
    cur.execute("""
        SELECT
        alert_id,
        alert_type,
        severity,
        detection_method,
        ear_value,
        consecutive_frame_count,
        cnn_confidence,
        cnn_label,
        alarm_triggered,
        occurred_at
        FROM alerts
        WHERE trip_id=%s
        ORDER BY occurred_at DESC
    """, (trip_id,))

    rows = cur.fetchall()

    conn.close()

    return rows


def get_all_alerts(
    driver_id: Optional[str] = None,
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100
):
    """Lịch sử cảnh báo trên toàn hệ thống, có thể lọc theo tài xế/loại/mức độ."""

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    query = """
        SELECT
        alert_id,
        trip_id,
        driver_id,
        alert_type,
        severity,
        detection_method,
        ear_value,
        cnn_confidence,
        cnn_label,
        alarm_triggered,
        occurred_at
        FROM alerts
        WHERE 1=1
    """
    params = []

    if driver_id:
        query += " AND driver_id=%s"
        params.append(driver_id)

    if alert_type:
        query += " AND alert_type=%s"
        params.append(alert_type)

    if severity:
        query += " AND severity=%s"
        params.append(severity)

    query += " ORDER BY occurred_at DESC LIMIT %s"
    params.append(limit)

    cur.execute(query, tuple(params))

    rows = cur.fetchall()

    conn.close()

    return rows
