from fastapi import APIRouter, HTTPException
from config.db import get_connection
from models.schemas import DriverCreate

router=APIRouter(
    tags=["Drivers"]
)

DRIVER_COLUMNS = (
    "driver_id",
    "full_name",
    "license_number",
    "phone",
    "email",
    "date_of_birth",
    "gender",
    "profile_photo_path",
    "baseline_ear",
    "status",
    "created_at",
    "updated_at",
)


def _row_to_driver(row):
    if row is None:
        return None
    return {key: value for key, value in zip(DRIVER_COLUMNS, row)}


@router.post("/drivers")
def create_driver(driver:DriverCreate):
    conn=get_connection()
    cur=conn.cursor()

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
    """,(
        driver.full_name,
        driver.license_number,
        driver.phone,
        driver.email,
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

    cur.execute(f"""
        SELECT {", ".join(DRIVER_COLUMNS)}
        FROM drivers
        ORDER BY full_name
    """)

    rows=cur.fetchall()

    conn.close()

    return {"drivers": [_row_to_driver(row) for row in rows]}


@router.get("/drivers/{driver_id}")
def get_driver(driver_id:str):
    conn=get_connection()
    cur=conn.cursor()

    cur.execute(f"""
        SELECT {", ".join(DRIVER_COLUMNS)}
        FROM drivers
        WHERE driver_id=%s
    """,(driver_id,))

    row=cur.fetchone()

    conn.close()
    driver=_row_to_driver(row)
    if driver is None:
        raise HTTPException(status_code=404, detail="driver not found")
    return driver


@router.put("/drivers/{driver_id}")
def update_driver(driver_id:str, driver:DriverCreate):
    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        UPDATE drivers
        SET
            full_name=%s,
            license_number=%s,
            phone=%s,
            email=%s,
            status=%s,
            updated_at=NOW()
        WHERE driver_id=%s
    """,(
        driver.full_name,
        driver.license_number,
        driver.phone,
        driver.email,
        driver.status,
        driver_id
    ))

    conn.commit()
    conn.close()

    return {
        "success":True
    }


@router.delete("/drivers/{driver_id}")
def delete_driver(driver_id:str):
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
