import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


def _url(base_url: str, path: str) -> str:
    cleaned = base_url.strip().rstrip("/")
    if not cleaned:
        raise ValueError("backend_url is required")
    if cleaned.endswith("/api/v1"):
        return cleaned + path
    return cleaned + "/api/v1" + path


def _request_json(url: str, payload: Dict[str, Any], timeout: float) -> Dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=max(0.1, float(timeout))) as resp:
        if int(resp.status) >= 400:
            raise urllib.error.URLError(f"HTTP {resp.status}")
        body = resp.read()
    return json.loads(body.decode("utf-8")) if body else {}


def post_alert_payload(
    backend_url: str,
    payload: Dict[str, Any],
    timeout: float = 2.0,
) -> Dict[str, Any]:
    return _request_json(_url(backend_url, "/alerts"), payload, timeout)


def post_monitoring_snapshot(
    backend_url: str,
    payload: Dict[str, Any],
    timeout: float = 0.5,
) -> Dict[str, Any]:
    return _request_json(_url(backend_url, "/monitoring/snapshot"), payload, timeout)


def post_monitoring_frame(
    backend_url: str,
    frame_jpeg: bytes,
    timeout: float = 0.25,
) -> Dict[str, Any]:
    req = urllib.request.Request(
        _url(backend_url, "/monitoring/frame"),
        data=frame_jpeg,
        headers={"Content-Type": "image/jpeg"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=max(0.1, float(timeout))) as resp:
        if int(resp.status) >= 400:
            raise urllib.error.URLError(f"HTTP {resp.status}")
        body = resp.read()
    return json.loads(body.decode("utf-8")) if body else {}


def append_outbox(outbox_path: str, payload: Dict[str, Any]) -> None:
    if not outbox_path:
        return
    path = Path(outbox_path)
    if path.parent and str(path.parent) != ".":
        path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, sort_keys=True) + "\n")


def _read_outbox(outbox_path: str) -> List[Dict[str, Any]]:
    path = Path(outbox_path)
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rows.append(json.loads(line))
    return rows


def _write_outbox(outbox_path: str, rows: Iterable[Dict[str, Any]]) -> None:
    path = Path(outbox_path)
    if path.parent and str(path.parent) != ".":
        path.parent.mkdir(parents=True, exist_ok=True)
    text = "".join(json.dumps(row, sort_keys=True) + "\n" for row in rows)
    path.write_text(text, encoding="utf-8")


def flush_outbox(
    backend_url: str,
    outbox_path: str,
    timeout: float = 2.0,
) -> int:
    queued = _read_outbox(outbox_path)
    if not queued:
        return 0

    sent = 0
    remaining = []
    for payload in queued:
        try:
            post_alert_payload(backend_url, payload, timeout=timeout)
            sent += 1
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            remaining.append(payload)
            remaining.extend(queued[sent + len(remaining):])
            break

    _write_outbox(outbox_path, remaining)
    return sent


def post_alert_or_queue(
    backend_url: str,
    payload: Dict[str, Any],
    timeout: float = 2.0,
    outbox_path: str = ".detector_alert_outbox.jsonl",
) -> bool:
    try:
        post_alert_payload(backend_url, payload, timeout=timeout)
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
        append_outbox(outbox_path, payload)
        return False

    if outbox_path:
        flush_outbox(backend_url, outbox_path, timeout=timeout)
    return True


def fetch_trip_settings(
    backend_url: str,
    trip_id: str,
    timeout: float = 2.0,
) -> Dict[str, Any]:
    req = urllib.request.Request(
        _url(backend_url, f"/trips/{urllib.request.quote(str(trip_id))}/settings"),
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=max(0.1, float(timeout))) as resp:
        if int(resp.status) >= 400:
            raise urllib.error.URLError(f"HTTP {resp.status}")
        body = resp.read()
    return json.loads(body.decode("utf-8")) if body else {}


def build_alert_frame_path(alert_frame_dir: str, alert_type: str, now: Optional[float] = None) -> Optional[str]:
    if not alert_frame_dir:
        return None
    os.makedirs(alert_frame_dir, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S", time.localtime(now or time.time()))
    millis = int(((now or time.time()) % 1) * 1000)
    safe_type = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in alert_type)
    return os.path.join(alert_frame_dir, f"{stamp}-{millis:03d}-{safe_type}.jpg")
