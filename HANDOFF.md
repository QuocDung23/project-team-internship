# Handoff: project-team-internship
**Date**: 2026-07-12
**Branch**: `new-branch`
**Session tool**: Codex

---

## Current Task
Admin and driver safety operations UI is being finalized: driver management, trip score/alert visibility, usable driver login creation, clearer alert driver identity, and a better `/trips` layout.

## What Was Done This Session
- Refactored the admin console into a denser operations UI.
  - Added `frontend/src/app/component/admin/AdminShell.tsx` with admin page/header/error/stat primitives.
  - Added `frontend/src/app/component/admin/AdminDialog.tsx`; dialog bodies are scrollable with a viewport max height.
  - Updated `frontend/src/app/pages/DashboardPage.tsx`, `frontend/src/app/pages/FleetPage.tsx`, `frontend/src/app/pages/AlertsPage.tsx`, and `frontend/src/app/pages/SettingsPage.tsx`.
- Made rows on the admin Drivers page clickable for management.
  - `frontend/src/app/component/drivers/DriverRow.tsx` and `frontend/src/app/component/drivers/DriverTable.tsx` now support `onSelectDriver`.
  - `frontend/src/app/pages/DriversPage.tsx` opens a create/manage dialog and shows driver activity, linked trips, scores, and recent alerts.
- Fixed driver trip/score/alert association.
  - `backend/models/trip.py` extends `TripResponse` with `driver_id`, `driver_name`, and `driver_email`.
  - `backend/repositories/trip_repository.py` resolves driver identity from latest assignment first, then `trips.created_by -> users.email -> drivers.email`.
  - `backend/services/alert_service.py` allows `driver_id` alert filtering through direct alert driver, trip assignment, or trip-owner driver email.
  - `frontend/src/app/services/backendApi.ts` and `frontend/tests/backendApi.test.mjs` were updated for enriched trips and `getTripsForDriver()`.
- Made admin-created drivers immediately login-capable.
  - `backend/models/driver.py` now requires `email` and `password` for `DriverCreate`; password min length is 12.
  - `backend/repositories/driver_repository.py` creates the `users` row and `drivers` row in one transaction via `create_driver_with_user()`.
  - `backend/services/driver_service.py` hashes the password, creates a `driver` role user, and rejects existing emails with `DriverConflictError`.
  - `frontend/src/app/pages/DriversPage.tsx` asks for password only in create mode and validates it before submit.
- Clarified admin alert driver identity.
  - `backend/services/alert_service.py` now includes `driver_name`, `driver_email`, and `license_number` in alert rows.
  - `frontend/src/app/services/backendAlerts.ts` maps those fields into `FleetAlertEvent` instead of hardcoded `"Tài xế hiện tại"` and `"Đang giám sát"`.
  - `frontend/tests/backendAlerts.test.mjs` covers the real driver-name/license mapping.
- Fixed `/trips` page layout and readability.
  - `frontend/src/app/pages/FleetPage.tsx` now uses matched desktop-height table/details panels with independent internal scrolling.
  - Trip table driver cells show driver name plus compact context.
  - Trip details group driver, score, total/critical alerts, route, times, and recent alerts.

## Next Steps
1. Manually verify the admin flows in the browser:
   - `/drivers`: create a driver with email/password, confirm the dialog scrolls, click a driver row, and confirm linked trips/scores/alerts render.
   - `/login`: sign in as the newly created driver, then confirm inactive/disabled driver profiles remain blocked.
   - `/trips`: confirm the table and details panel have matched desktop heights and independent scrolling.
   - `/alerts`: confirm rows show real driver name/license and acknowledgement still works.
2. Decide what to do with `0001-patch-2.patch`.
   - It is untracked and appears to be an exported patch, not part of the app source.
   - Remove it before cleanup if it is only a duplicate artifact.
3. Review the large existing diff carefully before committing.
   - Many files are modified from the admin refactor plus backend contract work.
   - Use `rtk git diff --stat HEAD` and targeted `rtk git diff -- <file>` reviews.
4. Run final cleanup verification before commit:
   - `rtk ./venv/bin/python -m unittest discover -s tests`
   - `cd frontend && rtk npm run test`
   - `cd frontend && rtk npx tsc --noEmit`
   - `cd frontend && rtk npm run lint`
   - `rtk git diff --check`

## Git State
**Branch**: `new-branch`

**Uncommitted changes observed before this handoff update**:
- `HANDOFF.md` - updated session handoff context.
- `backend/models/driver.py` - `DriverCreate` now requires email/password.
- `backend/models/trip.py` - trip responses expose resolved driver identity.
- `backend/repositories/driver_repository.py` - email conflict check and transactional user+driver creation.
- `backend/repositories/trip_repository.py` - resolved trip driver summary from assignment or creator email.
- `backend/services/alert_service.py` - acknowledgement/listing includes resolved driver info; driver filter includes trip ownership.
- `backend/services/driver_service.py` - creates hashed driver login user during driver creation.
- `frontend/src/app/component/admin/AdminDialog.tsx` - new scrollable admin dialog shell.
- `frontend/src/app/component/admin/AdminShell.tsx` - new shared admin primitives.
- `frontend/src/app/component/drivers/DriverRow.tsx` - clickable/selectable driver rows.
- `frontend/src/app/component/drivers/DriverTable.tsx` - passes row selection callback.
- `frontend/src/app/pages/AlertsPage.tsx` - admin alert page refresh/acknowledgement behavior and filters.
- `frontend/src/app/pages/DashboardPage.tsx` - admin operations dashboard.
- `frontend/src/app/pages/DriversPage.tsx` - create/manage driver dialog, password on create, activity panel.
- `frontend/src/app/pages/FleetPage.tsx` - admin Trips page summary, layout, details panel.
- `frontend/src/app/pages/SettingsPage.tsx` - admin settings layout refactor.
- `frontend/src/app/services/backendAlerts.ts` - alert mapper includes resolved driver identity and acknowledgement normalization.
- `frontend/src/app/services/backendApi.ts` - driver create payload includes password; trip type includes driver identity.
- `frontend/tests/backendAlerts.test.mjs` - alert mapping tests.
- `frontend/tests/backendApi.test.mjs` - driver/trip API mapping tests.
- `tests/test_alert_service.py` - alert acknowledgement, driver filter, and driver identity tests.
- `tests/test_driver_api.py` - driver create password validation/conflict API tests.
- `tests/test_driver_service.py` - hashed password and user creation service tests.
- `tests/test_trip_lifecycle_api.py` - enriched trip response tests.
- `tests/test_trip_lifecycle_integration.py` - updated driver create payload with password.

**Untracked files**:
- `0001-patch-2.patch` - exported patch artifact; decide whether to keep.

**Recent commits**:
```
2dbcdb5 patch 2
dba5cbf feat: add ClientSafetyEvent type for browser CNN collection
cabbe40 fix: camera scripts ( camera OK)
fc89f2b Enhance monitoring publisher and backend integration
86c548a feat: simplify trip safety workflow
2da70de chore: add project helper scripts
27b2331 fix: harden backend trip data handling
be58014 feat: improve live monitoring publishing
```

## Key Files
Files the next tool should understand before making changes:

- `frontend/src/app/pages/DriversPage.tsx` - admin driver create/manage dialog; password field in create mode; linked trips/score/alert activity panel.
- `frontend/src/app/pages/FleetPage.tsx` - admin `/trips` page with matched-height table/details layout and trip safety details.
- `frontend/src/app/pages/AlertsPage.tsx` - admin/global alerts view with filters and acknowledgement action.
- `frontend/src/app/services/backendAlerts.ts` - maps backend alerts into UI rows; now uses real driver name/license when available.
- `frontend/src/app/services/backendApi.ts` - frontend backend contract for drivers/trips/settings; `createDriver()` now requires `email` and `password`.
- `backend/services/alert_service.py` - legacy psycopg alert service; tuple/object shape is consumed by frontend tests.
- `backend/services/driver_service.py` - admin driver creation now creates a login user and hashes password.
- `backend/repositories/driver_repository.py` - transaction boundary for `users` + `drivers` creation.
- `backend/repositories/trip_repository.py` - trip driver identity resolution.

## Tests Already Run
- `rtk ./venv/bin/python -m unittest discover -s tests` - passed, 86 tests.
- `cd frontend && rtk npm run test` - passed, 19 tests.
- `cd frontend && rtk npx tsc --noEmit` - passed.
- `cd frontend && rtk npm run lint` - passed with one existing warning:
  - `frontend/src/app/auth/AuthContext.tsx:78:17` `react-refresh/only-export-components`.

## Decisions Made
- **Driver account creation**: Admin-created drivers must have email/password and get a linked `users` row with role `driver` immediately. Existing email reuse returns conflict; password reset for existing drivers is out of scope.
- **Driver disabled login**: Backend auth still blocks driver login when linked driver profile is `inactive` or `suspended`; frontend display status `disable` maps to those persisted statuses.
- **Driver trip association**: Trips can be linked to a driver by assignment or by `created_by` user email matching a driver email. Admin views should use that resolved identity.
- **Alert identity**: Alerts should show real driver names/license when possible. Resolution order is direct `alerts.driver_id`, latest trip assignment, then trip creator email.
- **Trips page layout**: Desktop `/trips` should keep table and details visible as same-height panels with independent scrolling. Mobile can stack normally with page scrolling.
- **Alert acknowledgement**: Acknowledgement remains one-way for now (`PATCH /api/v1/alerts/{alert_id}/acknowledge`); reversible acknowledgement or separate resolved/ignored workflow is out of scope.

## Active Blockers / Open Issues
- `0001-patch-2.patch` is still untracked and should be removed if it is only an exported duplicate.
- `rtk git diff --check` failed before this handoff rewrite because old `HANDOFF.md` had trailing whitespace. Re-run it after this update.
- Lint still reports the existing Fast Refresh warning in `frontend/src/app/auth/AuthContext.tsx:78:17`.

## Context Notes
- Repository instructions ask shell commands to be prefixed with `rtk`.
- Use `venv/bin/python` or `rtk ./venv/bin/python` for backend tests; the system Python may not have FastAPI/Pydantic installed.
- Do not revert unrelated dirty work. This branch intentionally contains a broad admin refactor plus backend contract updates.
- `backend/services/alert_service.py` is a legacy psycopg-style service. Its tuple response order matters to `frontend/src/app/services/backendAlerts.ts` and `frontend/tests/backendAlerts.test.mjs`.
- The current branch is ahead of `origin/new-branch` by 2 commits before these uncommitted changes.
