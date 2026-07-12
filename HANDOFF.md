# Handoff: project-team-internship
**Date**: 2026-07-12  
**Branch**: `new-branch`  
**Session tool**: Claude Code

---

## Current Task
Replace the Python detector process (`integrate_cnn_with_events.py`) with browser-side CNN inference (TF.js + MediaPipe) that runs while a driver trip is active, accumulates safety events client-side, and bulk-sends them to the backend on "End Trip".

## What Was Done This Session

- **TF.js bundling fixed**: TF.js ships CJS with `import` as a method name (reserved in ESM), breaking both Vite pre-bundling (esbuild syntax error) and raw-ESM serving (browser parse error). Fix: serve the IIFE bundle as a static asset (`/Users/ltnguyen/Personal/project-team-internship/frontend/public/tf.min.js`), loaded via `<script src="/tf.min.js">` in `index.html` before the app module. The hook uses `import type * as TF` for types only; `declare const tf` for runtime access.

- **MediaPipe bundling fixed**: Must stay in Vite's `optimizeDeps` (pre-bundled by esbuild). Excluding it causes `ENOENT: vision_bundle_mjs.js.map` at runtime.

- **`useBrowserCNN` hook** (`/Users/ltnguyen/Personal/project-team-internship/frontend/src/app/hook/useBrowserCNN.ts`): Full browser detection hook. Opens webcam, loads MediaPipe Face Landmarker (CDN), loads CNN model from `/models/drowsiness_cnn/model.json`, runs rAF detection loop. Returns `{ videoRef, metrics, isRunning, eventCount, start, stop }`.

- **Camera stream leak fixed**: Stream now stored in `streamRef` (not just `videoRef.current.srcObject`). `stop()` reads from `streamRef` directly — camera releases reliably on End Trip.

- **Video rendering deadlock fixed**: `<video ref={cnnVideoRef}>` must always be in DOM so `videoRef.current` is populated when `start()` is called. `activeTrip` is null when `cnnStart()` runs (React state not yet updated from `refresh()`), so conditional JSX would leave the element absent. Fix: always render the detection `<section>` with `className={activeTrip ? "" : "hidden"}` — CSS hides it visually but the element stays in DOM.

- **`duration_ms` 422 fixed**: Backend expects `int`; floating-point values like `666.666...` were rejected. Added `Math.floor()` to all three duration calculations in the hook.

- **MonitoringView removed**: Deleted `MonitoringView.tsx`, `CabinCam.tsx`, `DriverHeader.tsx`. Routes/nav entries cleaned up. All driver redirects now go to `/my-trip`.

- **Dev scripts** (`scripts/dev.sh`, `scripts/dev.ps1`): Detector startup removed. Scripts now auto-detect `venv/bin/python` (or `venv\Scripts\python.exe` on Windows) and fall back to system `python`. `PYTHON` env var still overrides.

- **Backend bulk ingest endpoint**: `POST /api/v1/safety-events/bulk-ingest` in `/Users/ltnguyen/Personal/project-team-internship/backend/api/routes/safety_events.py`. Accepts `list[SafetyEventIngestRequest]`, tolerates per-event duplicate/reference errors, returns `{ ingested, results }`.

## Git State

**Branch**: `new-branch` (ahead of origin by 12 commits, working tree clean)

**Recent commits**:
```
ab8ca13 Refactor useBrowserCNN to use IIFE loaded TensorFlow, improve stream handling, and ensure proper disposal of tensors
d3c0563 chore: remove Python detector from dev scripts (replaced by browser CNN)
3f7842c fix: allow Vite to pre-bundle MediaPipe to avoid missing sourcemap error
643f830 fix: exclude TF.js and MediaPipe from Vite pre-bundling
884dc82 fix: resolve lint errors in useBrowserCNN and MyTripPage
503b7a4 feat: remove MonitoringView page and route in favour of browser-side CNN
78455aa feat: wire useBrowserCNN into MyTripPage with webcam feed and live metrics
7071c1b feat: add bulkIngestSafetyEvents API function
1303709 feat: add useBrowserCNN hook for client-side drowsiness detection
a50275e feat: add bulk safety event ingest endpoint
2b7848f feat: add ClientSafetyEvent interface to monitoring types
```

## Key Files

- `/Users/ltnguyen/Personal/project-team-internship/frontend/src/app/hook/useBrowserCNN.ts` — Core detection hook. ~450 lines. Contains landmark indices, EAR/MAR/pitch thresholds, rAF loop, event firing logic. `start()` is async; `stop()` is sync and returns collected events.
- `/Users/ltnguyen/Personal/project-team-internship/frontend/src/app/pages/MyTripPage.tsx` — Trip page. Detection section uses CSS `hidden` (not JSX conditional) so `<video>` stays in DOM. Call order in `handleEndTrip`: `cnnStop()` → `bulkIngestSafetyEvents()` → `completeTrip()` → `refresh()` (events must be sent while trip is `in_progress`).
- `/Users/ltnguyen/Personal/project-team-internship/frontend/public/models/drowsiness_cnn/model.json` — TF.js model (converted from Keras `best_model_v2.h5` via SavedModel intermediate). Labels: `{ 0: "closed", 1: "open", 2: "yawn" }`.
- `/Users/ltnguyen/Personal/project-team-internship/frontend/public/tf.min.js` — TF.js 4.22.0 IIFE bundle (1.4MB), copied from `node_modules/@tensorflow/tfjs/dist/tf.min.js`.
- `/Users/ltnguyen/Personal/project-team-internship/frontend/vite.config.js` — No `optimizeDeps.exclude` for TF.js (removed). MediaPipe is pre-bundled by Vite (not excluded).
- `/Users/ltnguyen/Personal/project-team-internship/backend/api/routes/safety_events.py` — Bulk ingest at `/safety-events/bulk-ingest`.
- `/Users/ltnguyen/Personal/project-team-internship/frontend/src/app/types/monitoring/index.ts` — `ClientSafetyEvent` interface at the bottom.

## Decisions Made

- **TF.js via IIFE script tag, not ESM import**: Both Vite pre-bundling and raw ESM serving fail due to `async import(...)` method name (reserved keyword in strict mode). IIFE bypasses both bundlers entirely.
- **MediaPipe stays in Vite optimizeDeps**: Excluding it causes a missing `.map` file error at runtime; esbuild strips the sourcemap reference when pre-bundling, which makes it work.
- **CNN model loaded with `tf.loadLayersModel`**: Model was exported as SavedModel then converted with `tf_saved_model_conversion_v2`. If model fails to load, detection continues without CNN (EAR/MAR/pitch still fires events) — graceful degradation.
- **CSS `hidden` instead of JSX conditional on the detection section**: Needed because `activeTrip` is null when `cnnStart()` runs (state not yet flushed). `display:none` on parent keeps `<video>` in DOM.
- **`streamRef` for camera track lifecycle**: `videoRef.current.srcObject` can be null or stale; `streamRef.current` is set in `start()` and cleared in `stop()`, making track cleanup reliable.

## Active Blockers / Open Issues

- **CNN model may load as GraphModel, not LayersModel**: The model was converted via `tf.saved_model.save` + `tf_saved_model_conversion_v2`. SavedModel exports are typically `GraphModel` format. If `tf.loadLayersModel(...)` throws at runtime, change line ~210 in `useBrowserCNN.ts` to `tf.loadGraphModel("/models/drowsiness_cnn/model.json")` and update `modelRef` type to `TF.GraphModel`.
- **MediaPipe loads from CDN**: `FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm")` and the face landmarker model from Google Storage. Requires internet on first use; no offline support.

## Context Notes

- Backend runs on PostgreSQL `drowsiness_safety_db_schema` — no schema changes were made in this branch.
- The Python detector (`integrate_cnn_with_events.py`) still exists in the repo but is no longer started by `dev.sh`/`dev.ps1`. It can be safely deleted in a future cleanup.
- `best_model_v2.h5` (the original Keras model) is in the project root — not served, not imported anywhere. Keep it as the source of truth for model retraining.
- Frontend start: `bash scripts/dev.sh` — starts backend (uvicorn) + frontend (Vite). No detector process.
- Type-check: `cd frontend && npx tsc --noEmit`. Lint: `npm run lint`. Both pass clean.
