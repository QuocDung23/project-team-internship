import threading
import time
from typing import Any, Dict, Iterator, Optional


_condition = threading.Condition()
_latest_snapshot: Optional[Dict[str, Any]] = None
_latest_frame: Optional[bytes] = None
_latest_frame_content_type = "image/jpeg"
_frame_seq = 0


def update_monitoring_snapshot(payload: Dict[str, Any]) -> Dict[str, Any]:
    global _latest_snapshot

    snapshot = dict(payload)
    snapshot.pop("frame_jpeg_base64", None)
    snapshot["received_at"] = time.time()

    with _condition:
        snapshot["frame_available"] = _latest_frame is not None
        if _latest_frame is not None:
            snapshot["frame_timestamp"] = _frame_seq
        _latest_snapshot = snapshot
        return dict(_latest_snapshot)


def update_monitoring_frame(frame: bytes, content_type: str = "image/jpeg") -> Dict[str, Any]:
    global _latest_frame, _latest_frame_content_type, _frame_seq

    with _condition:
        _latest_frame = bytes(frame)
        _latest_frame_content_type = content_type
        _frame_seq += 1
        if _latest_snapshot is not None:
            _latest_snapshot["frame_available"] = True
            _latest_snapshot["frame_timestamp"] = _frame_seq
        _condition.notify_all()
        return {"ok": True, "frame_seq": _frame_seq}


def get_monitoring_snapshot() -> Optional[Dict[str, Any]]:
    with _condition:
        return dict(_latest_snapshot) if _latest_snapshot is not None else None


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
