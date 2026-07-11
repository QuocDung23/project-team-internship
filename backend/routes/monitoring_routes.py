from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from backend.models.schemas import MonitoringSnapshot
from backend.services.monitoring_service import (
    get_latest_frame,
    get_monitoring_snapshot,
    iter_mjpeg_stream,
    latest_frame_content_type,
    update_monitoring_frame,
    update_monitoring_snapshot,
)

router=APIRouter(
    tags=["Monitoring"]
)


@router.post("/monitoring/snapshot")
def save_monitoring_snapshot(snapshot: MonitoringSnapshot):
    return update_monitoring_snapshot(snapshot.dict())


@router.get("/monitoring/snapshot")
def read_monitoring_snapshot():
    snapshot=get_monitoring_snapshot()
    if snapshot is None:
        return {"available": False}
    snapshot["available"] = True
    return snapshot


@router.get("/monitoring/frame")
def read_monitoring_frame():
    frame=get_latest_frame()
    if frame is None:
        raise HTTPException(status_code=404, detail="detector frame not available")
    return Response(content=frame, media_type=latest_frame_content_type())


@router.post("/monitoring/frame")
async def save_monitoring_frame(request: Request):
    content_type=request.headers.get("content-type", "image/jpeg")
    frame=await request.body()
    if not frame:
        raise HTTPException(status_code=400, detail="empty frame")
    return update_monitoring_frame(frame, content_type=content_type)


@router.get("/monitoring/stream")
def stream_monitoring_frame():
    return StreamingResponse(
        iter_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
