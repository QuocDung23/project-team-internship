import json
import time

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from backend.models.schemas import MonitoringSnapshot
from backend.services.monitoring_risk_service import MonitoringRiskPersistenceService
from backend.services.monitoring_service import (
    get_latest_frame,
    get_monitoring_snapshot,
    iter_monitoring_snapshots,
    iter_mjpeg_stream,
    latest_frame_content_type,
    update_monitoring_frame,
    update_monitoring_snapshot,
)

router=APIRouter(
    tags=["Monitoring"]
)

NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}
MONITORING_RISK_SERVICE = MonitoringRiskPersistenceService()


@router.post("/monitoring/snapshot")
def save_monitoring_snapshot(snapshot: MonitoringSnapshot, background_tasks: BackgroundTasks):
    payload = snapshot.dict()
    result = update_monitoring_snapshot(payload)
    background_tasks.add_task(MONITORING_RISK_SERVICE.persist_snapshot_risks, payload)
    return result


@router.get("/monitoring/snapshot")
def read_monitoring_snapshot():
    snapshot=get_monitoring_snapshot()
    if snapshot is None:
        return {
            "available": False,
            "server_time": time.time(),
            "age_seconds": None,
            "stale": True,
            "health": "offline",
        }
    snapshot["available"] = True
    return snapshot


@router.get("/monitoring/frame")
def read_monitoring_frame():
    frame=get_latest_frame()
    if frame is None:
        raise HTTPException(status_code=404, detail="detector frame not available")
    return Response(content=frame, media_type=latest_frame_content_type(), headers=NO_CACHE_HEADERS)


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
        headers=NO_CACHE_HEADERS,
    )


@router.get("/monitoring/events")
def stream_monitoring_events():
    def event_stream():
        for snapshot in iter_monitoring_snapshots():
            event_name = "keepalive" if snapshot.get("type") == "keepalive" else "snapshot"
            yield f"event: {event_name}\ndata: {json.dumps(snapshot, default=str)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers=NO_CACHE_HEADERS,
    )
