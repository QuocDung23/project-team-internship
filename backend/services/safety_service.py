from config.db import get_connection


def get_safety_config():
    """Lấy cấu hình tính điểm an toàn từ settings (scope='global')."""

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
        warning_alert_penalty,
        critical_alert_penalty,
        safety_grade_a_min_score,
        safety_grade_b_min_score
        FROM settings
        WHERE scope='global'
        LIMIT 1
    """)

    row = cur.fetchone()
    conn.close()

    if row is None:
        # Fallback nếu chưa seed settings global
        return {
            "warning_alert_penalty": 3,
            "critical_alert_penalty": 8,
            "safety_grade_a_min_score": 85,
            "safety_grade_b_min_score": 60
        }

    return {
        "warning_alert_penalty": float(row[0]),
        "critical_alert_penalty": float(row[1]),
        "safety_grade_a_min_score": float(row[2]),
        "safety_grade_b_min_score": float(row[3])
    }


def calculate_safety(total_alerts, critical_alerts=0):
    """
    Tính điểm an toàn (0-100) và xếp hạng A/B/C dựa trên số lượng cảnh báo
    của một chuyến đi: ít cảnh báo -> điểm cao -> A, nhiều cảnh báo (đặc biệt
    cảnh báo mức critical) -> điểm thấp -> B hoặc C.
    """

    config = get_safety_config()

    warning_count = max(total_alerts - critical_alerts, 0)

    score = 100 - (warning_count * config["warning_alert_penalty"]) \
                - (critical_alerts * config["critical_alert_penalty"])

    score = max(0, min(100, score))

    if score >= config["safety_grade_a_min_score"]:
        grade = "A"
    elif score >= config["safety_grade_b_min_score"]:
        grade = "B"
    else:
        grade = "C"

    return round(score, 2), grade
