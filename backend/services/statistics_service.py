from psycopg2.extras import RealDictCursor

from config.db import get_connection


def get_overview():
    """Số liệu tổng quan: tổng tài xế, tổng chuyến đi, tổng cảnh báo,
    phân bố xếp hạng an toàn A/B/C và phân bố trạng thái chuyến đi."""

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT COUNT(*) AS total_drivers FROM drivers")
    total_drivers = cur.fetchone()["total_drivers"]

    cur.execute("SELECT COUNT(*) AS total_trips FROM trips")
    total_trips = cur.fetchone()["total_trips"]

    cur.execute("SELECT COUNT(*) AS total_alerts FROM alerts")
    total_alerts = cur.fetchone()["total_alerts"]

    cur.execute("""
        SELECT safety_grade, COUNT(*) AS count
        FROM trips
        WHERE safety_grade IS NOT NULL
        GROUP BY safety_grade
        ORDER BY safety_grade
    """)
    grade_distribution = cur.fetchall()

    cur.execute("""
        SELECT status, COUNT(*) AS count
        FROM trips
        GROUP BY status
    """)
    trip_status_distribution = cur.fetchall()

    conn.close()

    return {
        "total_drivers": total_drivers,
        "total_trips": total_trips,
        "total_alerts": total_alerts,
        "grade_distribution": grade_distribution,
        "trip_status_distribution": trip_status_distribution
    }


def get_alerts_by_type():
    """Số lượng cảnh báo theo từng loại (eyes_closed, drowsy_cnn, ...)
    -> dùng cho biểu đồ tròn/cột."""

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT alert_type, COUNT(*) AS count
        FROM alerts
        GROUP BY alert_type
        ORDER BY count DESC
    """)

    rows = cur.fetchall()
    conn.close()

    return rows


def get_alerts_timeline(days: int = 30):
    """Số lượng cảnh báo theo từng ngày trong N ngày gần nhất
    -> dùng cho biểu đồ đường (line chart) theo thời gian."""

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT
        DATE(occurred_at) AS day,
        COUNT(*) AS count,
        COUNT(*) FILTER (WHERE severity='critical') AS critical_count
        FROM alerts
        WHERE occurred_at >= NOW() - make_interval(days => %s)
        GROUP BY DATE(occurred_at)
        ORDER BY day
    """, (days,))

    rows = cur.fetchall()
    conn.close()

    return rows


def get_driver_ranking(limit: int = 10):
    """Xếp hạng tài xế theo điểm an toàn trung bình (chỉ tính các chuyến đã
    hoàn thành) -> dùng cho biểu đồ so sánh giữa các tài xế."""

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT
        d.driver_id,
        d.full_name,
        COUNT(t.trip_id) AS total_trips,
        ROUND(AVG(t.safety_score), 2) AS avg_safety_score,
        SUM(t.total_alerts_count) AS total_alerts
        FROM drivers d
        JOIN trips t ON t.driver_id = d.driver_id AND t.status='completed'
        GROUP BY d.driver_id, d.full_name
        ORDER BY avg_safety_score DESC NULLS LAST
        LIMIT %s
    """, (limit,))

    rows = cur.fetchall()
    conn.close()

    return rows
