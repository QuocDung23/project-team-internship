from config.db import get_connection
from services.safety_service import calculate_safety


def start_trip(driver_id):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        INSERT INTO trips
        (driver_id,status)
        VALUES(%s,'in_progress')
        RETURNING trip_id
    """,(driver_id,))

    trip_id=cur.fetchone()[0]

    conn.commit()
    conn.close()

    return str(trip_id)


def end_trip(trip_id):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT COUNT(*)
        FROM detection_events
        WHERE trip_id=%s
    """,(trip_id,))

    count=cur.fetchone()[0]

    rating=calculate_safety(count)

    cur.execute("""
        UPDATE trips
        SET
        status='completed',
        actual_end_time=NOW(),
        safety_rating=%s
        WHERE trip_id=%s
    """,(rating,trip_id))

    conn.commit()
    conn.close()

    return {
        "trip_id":str(trip_id),
        "alerts":count,
        "rating":rating
    }