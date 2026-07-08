import json

from fastapi import APIRouter, HTTPException
from psycopg2.extras import RealDictCursor

from config.db import get_connection
from models.schemas import SettingUpdate

router = APIRouter(
    tags=["Settings"]
)


def _row_to_response(row):
    """Gộp mar_threshold (lưu trong extra_config JSONB) ra field top-level
    và đổi tên ear_consec_frames -> frame_threshold để giữ đúng hợp đồng API
    cũ (SettingUpdate.frame_threshold)."""

    if row is None:
        return None

    extra = row.pop("extra_config", {}) or {}

    row["frame_threshold"] = row.pop("ear_consec_frames", None)
    row["mar_threshold"] = extra.get("mar_threshold")

    return row


@router.get("/settings")
def get_settings():

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Bug cũ: SELECT từ bảng "detection_settings" (không tồn tại), bảng đúng
    # là "settings" và cần lọc scope='global' (mỗi tài xế có thể có 1 bộ
    # cài đặt riêng, không được lấy nhầm).
    cur.execute("""
        SELECT *
        FROM settings
        WHERE scope='global'
        LIMIT 1
    """)

    data = cur.fetchone()

    conn.close()

    if data is None:
        raise HTTPException(status_code=404, detail="Chưa có cài đặt mặc định (global)")

    return _row_to_response(data)


@router.put("/settings")
def update_settings(
    setting: SettingUpdate
):

    conn = get_connection()
    cur = conn.cursor()

    # Bug cũ: bảng "detection_settings" không tồn tại; cột "mar_threshold" và
    # "frame_threshold" cũng không khớp schema thật (đúng là ear_consec_frames,
    # còn mar_threshold chưa có cột riêng -> lưu vào extra_config JSONB).
    cur.execute("""
        UPDATE settings
        SET
        ear_threshold=%s,
        ear_consec_frames=%s,
        cnn_confidence_threshold=%s,
        extra_config = extra_config || %s::jsonb
        WHERE scope='global'
    """, (
        setting.ear_threshold,
        setting.frame_threshold,
        setting.cnn_confidence_threshold,
        json.dumps({"mar_threshold": setting.mar_threshold})
    ))

    updated = cur.rowcount

    conn.commit()
    conn.close()

    if updated == 0:
        raise HTTPException(status_code=404, detail="Chưa có cài đặt mặc định (global) để cập nhật")

    return {
        "success": True
    }


@router.get("/settings/{driver_id}")
def get_driver_settings(driver_id: str):
    """Cài đặt hiệu lực cho 1 tài xế: ưu tiên cài đặt riêng, nếu chưa có thì
    dùng cài đặt global (dùng view effective_driver_settings có sẵn trong DB)."""

    conn = get_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("""
        SELECT *
        FROM effective_driver_settings
        WHERE driver_id=%s
    """, (driver_id,))

    data = cur.fetchone()

    conn.close()

    if data is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài xế")

    return data


@router.put("/settings/{driver_id}")
def update_driver_settings(
    driver_id: str,
    setting: SettingUpdate
):
    """Tạo mới hoặc ghi đè cài đặt riêng (scope='driver') cho 1 tài xế."""

    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO settings
            (scope, driver_id, ear_threshold, ear_consec_frames,
             cnn_confidence_threshold, extra_config)
            VALUES('driver', %s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (driver_id)
            DO UPDATE SET
                ear_threshold=EXCLUDED.ear_threshold,
                ear_consec_frames=EXCLUDED.ear_consec_frames,
                cnn_confidence_threshold=EXCLUDED.cnn_confidence_threshold,
                extra_config=EXCLUDED.extra_config
        """, (
            driver_id,
            setting.ear_threshold,
            setting.frame_threshold,
            setting.cnn_confidence_threshold,
            json.dumps({"mar_threshold": setting.mar_threshold})
        ))

        conn.commit()

    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(exc))

    finally:
        conn.close()

    return {
        "success": True
    }
