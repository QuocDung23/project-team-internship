from config.db import get_connection


def create_alert(
    trip_id:str,
    alert_type:str,
    method:str
):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        INSERT INTO detection_events
        (
            trip_id,
            detection_method,
            alert_type
        )
        VALUES(%s,%s,%s)
        RETURNING event_id
    """,(trip_id,method,alert_type))

    event_id=cur.fetchone()[0]

    conn.commit()
    conn.close()

    return str(event_id)


def get_trip_alerts(
    trip_id:str
):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT
        event_id,
        alert_type,
        detection_method,
        created_at
        FROM detection_events
        WHERE trip_id=%s
        ORDER BY created_at DESC
    """,(trip_id,))

    rows=cur.fetchall()

    conn.close()

    return rows