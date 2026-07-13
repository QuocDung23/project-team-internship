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
    "driver_name",
    "driver_email",
    "license_number",
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


def get_trip_alerts(trip_id: str):
    return get_alerts(trip_id=trip_id)


def acknowledge_alert(alert_id: str, *, current_user: dict):
    conn = get_connection()
    cur = conn.cursor()

    role = current_user.get("role")
    role_value = getattr(role, "value", role)
    user_id = str(current_user.get("user_id") or "")
    params = [user_id, alert_id]
    auth_sql = ""

    if role_value == "driver":
        auth_sql = """
            AND EXISTS (
                SELECT 1
                FROM trips t
                LEFT JOIN drivers d ON d.driver_id = a.driver_id
                WHERE t.trip_id = a.trip_id
                  AND (
                    t.created_by=%s
                    OR lower(d.email)=lower(%s)
                  )
            )
        """
        params.extend([user_id, (current_user.get("email") or "").strip()])

    cur.execute(f"""
        UPDATE alerts a
        SET status='acknowledged',
            acknowledged_at=COALESCE(a.acknowledged_at, now()),
            acknowledged_by=%s,
            updated_at=now()
        WHERE a.alert_id=%s
        {auth_sql}
        RETURNING alert_id
    """, tuple(params))

    if cur.fetchone() is None:
        conn.close()
        raise ValueError("alert not found")

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
            a.created_at,
            COALESCE(d.full_name, driver_identity.full_name, owner_driver.full_name),
            COALESCE(d.email, driver_identity.email, owner_driver.email),
            COALESCE(d.license_number, driver_identity.license_number, owner_driver.license_number)
        FROM alerts a
        LEFT JOIN LATERAL (
            SELECT linked_se.*
            FROM alert_safety_events linked_ase
            JOIN safety_events linked_se
                ON linked_se.safety_event_id = linked_ase.safety_event_id
            WHERE linked_ase.alert_id = a.alert_id
            ORDER BY linked_se.occurred_at DESC, linked_se.created_at DESC
            LIMIT 1
        ) se ON TRUE
        LEFT JOIN drivers d ON d.driver_id = a.driver_id
        LEFT JOIN LATERAL (
            SELECT assigned_driver.full_name, assigned_driver.email, assigned_driver.license_number
            FROM trip_assignments ta
            JOIN drivers assigned_driver ON assigned_driver.driver_id = ta.driver_id
            WHERE ta.trip_id = a.trip_id
            ORDER BY ta.created_at DESC
            LIMIT 1
        ) driver_identity ON TRUE
        LEFT JOIN LATERAL (
            SELECT owner_driver.full_name, owner_driver.email, owner_driver.license_number
            FROM trips owner_trip
            JOIN users owner_user ON owner_user.user_id = owner_trip.created_by
            JOIN drivers owner_driver ON lower(owner_driver.email) = lower(owner_user.email)
            WHERE owner_trip.trip_id = a.trip_id
            ORDER BY owner_driver.updated_at DESC
            LIMIT 1
        ) owner_driver ON TRUE
        WHERE a.alert_id=%s
        LIMIT 1
    """, (alert_id,))
    alert = _row_to_alert(cur.fetchone())

    conn.commit()
    conn.close()

    if alert is None:
        raise ValueError("alert not found")
    return alert


def get_alerts(
    *,
    trip_id: str | None = None,
    driver_id: str | None = None,
    severity: str | None = None,
    alert_type: str | None = None,
    status: str | None = None,
    current_user: dict | None = None,
):
    conn=get_connection()
    cur=conn.cursor()

    where_clauses = []
    params = []

    if trip_id:
        where_clauses.append("a.trip_id=%s")
        params.append(trip_id)
    if driver_id:
        where_clauses.append(
            """
            (
                a.driver_id=%s
                OR EXISTS (
                    SELECT 1
                    FROM trip_assignments ta
                    WHERE ta.trip_id = a.trip_id
                      AND ta.driver_id = %s
                )
                OR EXISTS (
                    SELECT 1
                    FROM trips owner_trip
                    JOIN users owner_user
                        ON owner_user.user_id = owner_trip.created_by
                    JOIN drivers owner_driver
                        ON lower(owner_driver.email) = lower(owner_user.email)
                    WHERE owner_trip.trip_id = a.trip_id
                      AND owner_driver.driver_id = %s
                )
            )
            """
        )
        params.extend([driver_id, driver_id, driver_id])
    if severity:
        canonical_severity = "critical" if severity in {"critical", "high"} else "warning"
        where_clauses.append("a.severity=%s")
        params.append(canonical_severity)
    if alert_type:
        where_clauses.append("a.alert_type=%s")
        params.append(_canonical_alert_type(alert_type))
    if status:
        where_clauses.append("a.status=%s")
        params.append(status)
    else:
        where_clauses.append("a.status <> 'ignored'")

    current_role = current_user.get("role") if current_user else None
    current_role_value = getattr(current_role, "value", current_role)
    if current_user and current_role_value == "driver":
        where_clauses.append(
            """
            (
                t.created_by=%s
                OR lower(d.email)=lower(%s)
            )
            """
        )
        params.extend([
            str(current_user.get("user_id") or ""),
            (current_user.get("email") or "").strip(),
        ])

    where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

    cur.execute(f"""
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
            a.created_at,
            COALESCE(d.full_name, driver_identity.full_name, owner_driver.full_name),
            COALESCE(d.email, driver_identity.email, owner_driver.email),
            COALESCE(d.license_number, driver_identity.license_number, owner_driver.license_number)
        FROM alerts a
        LEFT JOIN LATERAL (
            SELECT linked_se.*
            FROM alert_safety_events linked_ase
            JOIN safety_events linked_se
                ON linked_se.safety_event_id = linked_ase.safety_event_id
            WHERE linked_ase.alert_id = a.alert_id
            ORDER BY linked_se.occurred_at DESC, linked_se.created_at DESC
            LIMIT 1
        ) se ON TRUE
        LEFT JOIN trips t ON t.trip_id = a.trip_id
        LEFT JOIN drivers d ON d.driver_id = a.driver_id
        LEFT JOIN LATERAL (
            SELECT assigned_driver.full_name, assigned_driver.email, assigned_driver.license_number
            FROM trip_assignments ta
            JOIN drivers assigned_driver ON assigned_driver.driver_id = ta.driver_id
            WHERE ta.trip_id = a.trip_id
            ORDER BY ta.created_at DESC
            LIMIT 1
        ) driver_identity ON TRUE
        LEFT JOIN LATERAL (
            SELECT owner_driver.full_name, owner_driver.email, owner_driver.license_number
            FROM trips owner_trip
            JOIN users owner_user ON owner_user.user_id = owner_trip.created_by
            JOIN drivers owner_driver ON lower(owner_driver.email) = lower(owner_user.email)
            WHERE owner_trip.trip_id = a.trip_id
            ORDER BY owner_driver.updated_at DESC
            LIMIT 1
        ) owner_driver ON TRUE
        {where_sql}
        ORDER BY COALESCE(se.occurred_at, a.opened_at) DESC
    """, tuple(params))

    rows=cur.fetchall()

    conn.close()

    return [_row_to_alert(row) for row in rows]


def _canonical_alert_type(alert_type: str) -> str:
    if alert_type in {"yawn", "yawning", "yawning_detected", "yawn_alert"}:
        raise ValueError("yawning is notification-only and cannot be persisted as an alert")
    if alert_type in {"camera_issue", "no_face_detected", "camera_blocked"}:
        return "camera_issue"
    if alert_type in {"driver_inattention", "head_nod", "head_nodding_detected", "distraction"}:
        return "driver_inattention"
    if alert_type in {"system", "manual_review"}:
        return alert_type
    return "drowsiness"
