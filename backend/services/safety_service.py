def calculate_safety(alert_count):

    if alert_count <= 3:
        return "A"

    elif alert_count <= 8:
        return "B"

    return "C"