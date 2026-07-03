from fastapi import APIRouter
from config.db import get_connection
from models.schemas import DriverCreate

router=APIRouter(
    tags=["Drivers"]
)


@router.post("/drivers")
def create_driver(
    driver:DriverCreate
):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        INSERT INTO drivers
        (
            full_name,
            license_number,
            status
        )
        VALUES(%s,%s,%s)
        RETURNING driver_id
    """,(
        driver.full_name,
        driver.license_number,
        driver.status
    ))

    driver_id=cur.fetchone()[0]

    conn.commit()
    conn.close()

    return {
        "driver_id":str(driver_id)
    }


@router.get("/drivers")
def get_drivers():

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT *
        FROM drivers
        ORDER BY full_name
    """)

    rows=cur.fetchall()

    conn.close()

    return rows


@router.get("/drivers/{driver_id}")
def get_driver(
    driver_id:str
):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT *
        FROM drivers
        WHERE driver_id=%s
    """,(driver_id,))

    row=cur.fetchone()

    conn.close()

    return row


@router.put("/drivers/{driver_id}")
def update_driver(
    driver_id:str,
    driver:DriverCreate
):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        UPDATE drivers
        SET
        full_name=%s,
        license_number=%s,
        status=%s
        WHERE driver_id=%s
    """,(
        driver.full_name,
        driver.license_number,
        driver.status,
        driver_id
    ))

    conn.commit()
    conn.close()

    return {
        "success":True
    }


@router.delete("/drivers/{driver_id}")
def delete_driver(
    driver_id:str
):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        DELETE FROM drivers
        WHERE driver_id=%s
    """,(driver_id,))

    conn.commit()
    conn.close()

    return {
        "success":True
    }