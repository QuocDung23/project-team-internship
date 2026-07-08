from typing import Optional

from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor

from config.db import get_connection
from models.schemas import DriverCreate

router = APIRouter(
    tags=["Drivers"]
)


@router.post("/drivers")
def create_driver(
    driver: DriverCreate
):

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO drivers
            (
                full_name,
                license_number,
                phone,
                email,
                status
            )
            VALUES(%s,%s,%s,%s,%s)
            RETURNING driver_id
        """, (
            driver.full_name,
            driver.license_number,
            driver.phone,
            driver.email,
            driver.status
        ))

        driver_id = cur.fetchone()[0]

        conn.commit()

    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    finally:
        conn.close()

    return {
        "driver_id": str(driver_id)
    }


@router.get("/drivers")
def get_drivers(
    status: Optional[str] = None
):

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    if status:
        cur.execute("""
            SELECT *
            FROM drivers
            WHERE status=%s
            ORDER BY full_name
        """, (status,))
    else:
        cur.execute("""
            SELECT *
            FROM drivers
            ORDER BY full_name
        """)

    rows = cur.fetchall()

    conn.close()

    return rows


@router.get("/drivers/{driver_id}")
def get_driver(
    driver_id: str
):

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT *
        FROM drivers
        WHERE driver_id=%s
    """, (driver_id,))

    row = cur.fetchone()

    conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài xế")

    return row


@router.put("/drivers/{driver_id}")
def update_driver(
    driver_id: str,
    driver: DriverCreate
):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE drivers
        SET
        full_name=%s,
        license_number=%s,
        phone=%s,
        email=%s,
        status=%s
        WHERE driver_id=%s
    """, (
        driver.full_name,
        driver.license_number,
        driver.phone,
        driver.email,
        driver.status,
        driver_id
    ))

    updated = cur.rowcount

    conn.commit()
    conn.close()

    if updated == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài xế")

    return {
        "success": True
    }


@router.delete("/drivers/{driver_id}")
def delete_driver(
    driver_id: str
):

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        DELETE FROM drivers
        WHERE driver_id=%s
    """, (driver_id,))

    deleted = cur.rowcount

    conn.commit()
    conn.close()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài xế")

    return {
        "success": True
    }
