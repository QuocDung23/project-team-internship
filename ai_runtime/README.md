# AI Runtime Integration Layer

`integrate_cnn.py` is the source of truth for detection and display behavior.

This package does not replace the detector. It only provides:

- SafetyEvent JSON builders
- Local console / JSONL publishers
- A future `BackendApiPublisher` boundary
- A wrapper entrypoint that delegates to `integrate_cnn.py`

## Run The Restored Detector

Use the original detector directly:

```bash
python integrate_cnn.py --camera 1
```

Or through the wrapper:

```bash
python -m ai_runtime.main --camera 1
```

All arguments are passed to `integrate_cnn.py`.

## SafetyEvent Output

By default, SafetyEvent JSON is appended to:

```bash
logs/ai_safety_events.jsonl
```

Console SafetyEvent output is disabled by default to avoid blocking the camera loop.

Configure the local event log:

```bash
python integrate_cnn.py --camera 1 --safety-event-log logs/demo_safety_events.jsonl
```

Enable console SafetyEvent output:

```bash
python integrate_cnn.py --camera 1 --safety-events-console
```

Disable SafetyEvent integration for old-detector performance comparison:

```bash
python integrate_cnn.py --camera 1 --disable-safety-events
```

## Detection Behavior

Detection remains owned by `integrate_cnn.py`:

- drowsiness / eye closure
- yawning
- head nodding
- EAR
- MAR
- head pose / pitch
- alarm timing
- overlay display
- frame flip and color pipeline
- camera backend behavior

SafetyEvents are emitted only from the original trigger points:

- `ear_alert and not prev_eye_alert`
- `mar_alert and not prev_mar_alert`
- `pose_alert and not prev_pose_alert`
