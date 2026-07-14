import threading
import time
from typing import Any, Dict, Iterator, Optional


_condition = threading.Condition()
_latest_snapshot: Optional[Dict[str, Any]] = None
_latest_frame: Optional[bytes] = None
_latest_frame_content_type = "image/jpeg"
_frame_seq = 0
_snapshot_received_at: Optional[float] = None
_frame_received_at: Optional[float] = None
STALE_AFTER_SECONDS = 3.0


def _age_seconds(now: float, received_at: Optional[float]) -> Optional[float]:
    if received_at is None:
        return None
    return max(0.0, now - received_at)


def _decorate_snapshot(snapshot: Dict[str, Any], now: Optional[float] = None) -> Dict[str, Any]:
    current_time = time.time() if now is None else now
    snapshot = dict(snapshot)
    snapshot["server_time"] = current_time
    snapshot["snapshot_received_at"] = _snapshot_received_at
    snapshot["frame_received_at"] = _frame_received_at
    snapshot["snapshot_age_seconds"] = _age_seconds(current_time, _snapshot_received_at)
    snapshot["frame_age_seconds"] = _age_seconds(current_time, _frame_received_at)
    snapshot["frame_available"] = _latest_frame is not None
    if _latest_frame is not None:
        snapshot["frame_timestamp"] = _frame_seq
    snapshot["stale"] = (
        snapshot["snapshot_age_seconds"] is None
        or snapshot["snapshot_age_seconds"] > STALE_AFTER_SECONDS
        or snapshot["frame_age_seconds"] is None
        or snapshot["frame_age_seconds"] > STALE_AFTER_SECONDS
    )
    return snapshot


def update_monitoring_snapshot(payload: Dict[str, Any]) -> Dict[str, Any]:
    global _latest_snapshot, _snapshot_received_at

    snapshot = dict(payload)
    snapshot.pop("frame_jpeg_base64", None)
    received_at = time.time()
    snapshot["received_at"] = received_at

    with _condition:
        _snapshot_received_at = received_at
        snapshot["frame_available"] = _latest_frame is not None
        if _latest_frame is not None:
            snapshot["frame_timestamp"] = _frame_seq
        _latest_snapshot = snapshot
        return _decorate_snapshot(_latest_snapshot, now=received_at)


def update_monitoring_frame(frame: bytes, content_type: str = "image/jpeg") -> Dict[str, Any]:
    global _latest_frame, _latest_frame_content_type, _frame_seq, _frame_received_at

    with _condition:
        _latest_frame = bytes(frame)
        _latest_frame_content_type = content_type
        _frame_seq += 1
        _frame_received_at = time.time()
        if _latest_snapshot is not None:
            _latest_snapshot["frame_available"] = True
            _latest_snapshot["frame_timestamp"] = _frame_seq
        _condition.notify_all()
        return {"ok": True, "frame_seq": _frame_seq}


def get_monitoring_snapshot() -> Optional[Dict[str, Any]]:
    with _condition:
        return _decorate_snapshot(_latest_snapshot) if _latest_snapshot is not None else None


def get_latest_frame() -> Optional[bytes]:
    with _condition:
        return _latest_frame


def latest_frame_content_type() -> str:
    with _condition:
        return _latest_frame_content_type


def iter_mjpeg_stream(target_fps: float = 20.0) -> Iterator[bytes]:
    boundary = b"--frame\r\n"
    last_seq = -1
    wait_timeout = 1.0 / max(1.0, float(target_fps))

    while True:
        with _condition:
            _condition.wait_for(lambda: _latest_frame is not None and _frame_seq != last_seq, timeout=1.0)
            if _latest_frame is None or _frame_seq == last_seq:
                continue
            frame = _latest_frame
            content_type = _latest_frame_content_type
            last_seq = _frame_seq

        yield (
            boundary
            + f"Content-Type: {content_type}\r\n".encode("ascii")
            + f"Content-Length: {len(frame)}\r\n\r\n".encode("ascii")
            + frame
            + b"\r\n"
        )
        time.sleep(wait_timeout)
