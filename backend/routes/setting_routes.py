from fastapi import APIRouter
from config.db import get_connection
from models.schemas import SettingUpdate

router=APIRouter(
    tags=["Settings"]
)


@router.get("/settings")
def get_settings():

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        SELECT *
        FROM detection_settings
        LIMIT 1
    """)

    data=cur.fetchone()

    conn.close()

    return data


@router.put("/settings")
def update_settings(
    setting:SettingUpdate
):

    conn=get_connection()
    cur=conn.cursor()

    cur.execute("""
        UPDATE detection_settings
        SET
        ear_threshold=%s,
        mar_threshold=%s,
        frame_threshold=%s
    """,(
        setting.ear_threshold,
        setting.mar_threshold,
        setting.frame_threshold
    ))

    conn.commit()
    conn.close()

    return {
        "success":True
    }