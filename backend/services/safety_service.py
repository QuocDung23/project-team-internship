def calculate_safety(alert_count):

    if alert_count <= 3:
        return "A"

    elif alert_count <= 8:
        return "B"

    return "C"


def calculate_safety_score(
    total_alerts:int,
    critical_alerts:int,
    warning_penalty:float=3,
    critical_penalty:float=8,
) -> float:
    warning_alerts = max(0, int(total_alerts) - int(critical_alerts))
    score = 100.0 - (warning_alerts * float(warning_penalty)) - (
        int(critical_alerts) * float(critical_penalty)
    )
    return max(0.0, min(100.0, round(score, 2)))


def safety_grade(score:float, grade_a_min:float=85, grade_b_min:float=60) -> str:
    if float(score) >= float(grade_a_min):
        return "A"
    if float(score) >= float(grade_b_min):
        return "B"
    return "C"
