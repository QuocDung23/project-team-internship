-- ============================================================================
-- AI-Powered Real-Time Trip Safety Management System
-- PostgreSQL schema for a production-oriented modular monolith.
--
-- Design principles:
-- - FastAPI backend owns all database writes.
-- - AI detector runtime writes only through backend APIs.
-- - Live frames/snapshots are operational state, not permanent database rows.
-- - SafetyEvent is an immutable detected fact.
-- - Alert is an actionable notification with lifecycle state.
-- - SafetyScore is explainable and rule-based, not ML-generated.
--
-- PostgreSQL 14+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM (
    'admin',
    'driver'
);

CREATE TYPE user_status AS ENUM (
    'active',
    'inactive'
);

CREATE TYPE driver_status AS ENUM (
    'active',
    'inactive',
    'suspended'
);

CREATE TYPE driver_session_status AS ENUM (
    'active',
    'ended',
    'expired'
);

CREATE TYPE vehicle_status AS ENUM (
    'available',
    'assigned',
    'maintenance',
    'inactive'
);

CREATE TYPE trip_status AS ENUM (
    'draft',
    'scheduled',
    'assigned',
    'in_progress',
    'completed',
    'cancelled',
    'aborted'
);

CREATE TYPE assignment_status AS ENUM (
    'assigned',
    'in_progress',
    'completed',
    'cancelled',
    'released'
);

CREATE TYPE monitoring_status AS ENUM (
    'active',
    'ended',
    'failed'
);

CREATE TYPE safety_event_type AS ENUM (
    'drowsiness_detected',
    'eyes_closed',
    'yawning',
    'yawning_detected',
    'no_face_detected',
    'head_nod',
    'head_nodding_detected',
    'distraction',
    'camera_blocked'
);

CREATE TYPE detection_method AS ENUM (
    'ear_dlib',
    'mar_dlib',
    'head_pose',
    'cnn_classifier',
    'combined',
    'manual'
);

CREATE TYPE event_severity AS ENUM (
    'low',
    'medium',
    'high'
);

CREATE TYPE alert_type AS ENUM (
    'drowsiness',
    'driver_inattention',
    'camera_issue',
    'manual_review',
    'system'
);

CREATE TYPE alert_status AS ENUM (
    'open',
    'acknowledged',
    'escalated',
    'resolved',
    'ignored'
);

CREATE TYPE alert_severity AS ENUM (
    'info',
    'warning',
    'critical'
);

CREATE TYPE safety_grade AS ENUM (
    'A',
    'B',
    'C'
);

CREATE TYPE settings_scope AS ENUM (
    'global',
    'driver'
);

-- ============================================================================
-- SHARED FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_safety_event_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'safety_events are immutable after creation';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT,
    role          user_role NOT NULL DEFAULT 'driver',
    status        user_status NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE users IS 'System users such as admins and drivers.';

-- ============================================================================
-- DRIVERS
-- ============================================================================

CREATE TABLE drivers (
    driver_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_code     VARCHAR(20) NOT NULL UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    license_number  VARCHAR(50) NOT NULL UNIQUE,
    phone           VARCHAR(30),
    email           VARCHAR(150),
    status          driver_status NOT NULL DEFAULT 'active',
    baseline_ear    NUMERIC(5,3),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_drivers_baseline_ear
        CHECK (baseline_ear IS NULL OR baseline_ear >= 0)
);

CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE drivers IS 'Driver profile and calibration data.';
COMMENT ON COLUMN drivers.driver_code IS 'Short operator-facing driver code such as DRV-001.';
COMMENT ON COLUMN drivers.baseline_ear IS 'Optional calibrated eye aspect ratio baseline for this driver.';

-- Existing deployments can backfill driver_code before enforcing NOT NULL:
-- WITH numbered AS (
--     SELECT driver_id, row_number() OVER (ORDER BY created_at, full_name, driver_id) AS row_num
--     FROM drivers
-- )
-- UPDATE drivers d
-- SET driver_code = 'DRV-' || lpad(numbered.row_num::text, 3, '0')
-- FROM numbered
-- WHERE d.driver_id = numbered.driver_id
--   AND d.driver_code IS NULL;

-- ============================================================================
-- DRIVER SESSIONS
-- ============================================================================

CREATE TABLE driver_sessions (
    driver_session_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id          UUID NOT NULL REFERENCES drivers(driver_id) ON DELETE RESTRICT,
    status             driver_session_status NOT NULL DEFAULT 'active',
    started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at           TIMESTAMPTZ,
    device_label       VARCHAR(100),
    notes              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_driver_sessions_time
        CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT chk_driver_sessions_end_state
        CHECK (
            (status = 'active' AND ended_at IS NULL)
            OR (status IN ('ended', 'expired') AND ended_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX uq_active_driver_session
    ON driver_sessions(driver_id)
    WHERE status = 'active';

COMMENT ON TABLE driver_sessions IS 'Operational session for a driver using the detector or dashboard workflow.';

-- ============================================================================
-- VEHICLES
-- ============================================================================

CREATE TABLE vehicles (
    vehicle_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number  VARCHAR(30) NOT NULL UNIQUE,
    vehicle_type  VARCHAR(50),
    status        vehicle_status NOT NULL DEFAULT 'available',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE vehicles IS 'Vehicle master data.';

-- ============================================================================
-- TRIPS
-- ============================================================================

CREATE TABLE trips (
    trip_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code               VARCHAR(50) UNIQUE,
    status             trip_status NOT NULL DEFAULT 'draft',
    planned_start_at   TIMESTAMPTZ,
    planned_end_at     TIMESTAMPTZ,
    actual_start_at    TIMESTAMPTZ,
    actual_end_at      TIMESTAMPTZ,
    origin             TEXT,
    destination        TEXT,
    cancelled_reason   TEXT,
    aborted_reason     TEXT,
    created_by         UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_trips_planned_time
        CHECK (planned_end_at IS NULL OR planned_start_at IS NULL OR planned_end_at >= planned_start_at),
    CONSTRAINT chk_trips_actual_time
        CHECK (actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at >= actual_start_at),
    CONSTRAINT chk_trips_cancelled_reason
        CHECK (status <> 'cancelled' OR cancelled_reason IS NOT NULL),
    CONSTRAINT chk_trips_aborted_reason
        CHECK (status <> 'aborted' OR aborted_reason IS NOT NULL)
);

CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE trips IS 'Trip lifecycle record: draft, scheduled, assigned, in progress, completed, cancelled, or aborted.';

-- ============================================================================
-- TRIP ASSIGNMENTS
-- ============================================================================

CREATE TABLE trip_assignments (
    trip_assignment_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id             UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    driver_id           UUID NOT NULL REFERENCES drivers(driver_id) ON DELETE RESTRICT,
    vehicle_id          UUID NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE RESTRICT,
    status              assignment_status NOT NULL DEFAULT 'assigned',
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_trip_assignments_time
        CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at),
    CONSTRAINT chk_trip_assignments_end_state
        CHECK (
            (status IN ('assigned', 'in_progress') AND unassigned_at IS NULL)
            OR (status IN ('completed', 'cancelled', 'released') AND unassigned_at IS NOT NULL)
        )
);

CREATE UNIQUE INDEX uq_active_trip_assignment
    ON trip_assignments(trip_id)
    WHERE status IN ('assigned', 'in_progress');

CREATE UNIQUE INDEX uq_active_driver_assignment
    ON trip_assignments(driver_id)
    WHERE status IN ('assigned', 'in_progress');

CREATE UNIQUE INDEX uq_active_vehicle_assignment
    ON trip_assignments(vehicle_id)
    WHERE status IN ('assigned', 'in_progress');

COMMENT ON TABLE trip_assignments IS 'Connects one trip to the active driver and vehicle assignment.';

-- ============================================================================
-- MONITORING SESSIONS
-- ============================================================================

CREATE TABLE monitoring_sessions (
    monitoring_session_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id                UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    driver_session_id      UUID REFERENCES driver_sessions(driver_session_id) ON DELETE SET NULL,
    status                 monitoring_status NOT NULL DEFAULT 'active',
    detector_instance_id   VARCHAR(100),
    camera_index           INTEGER,
    started_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at               TIMESTAMPTZ,
    last_snapshot_at       TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_monitoring_sessions_time
        CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT chk_monitoring_sessions_end_state
        CHECK (
            (status = 'active' AND ended_at IS NULL)
            OR (status IN ('ended', 'failed') AND ended_at IS NOT NULL)
        ),
    CONSTRAINT chk_monitoring_sessions_camera_index
        CHECK (camera_index IS NULL OR camera_index >= 0),
    CONSTRAINT uq_monitoring_sessions_id_trip
        UNIQUE (monitoring_session_id, trip_id)
);

CREATE UNIQUE INDEX uq_active_monitoring_session_per_trip
    ON monitoring_sessions(trip_id)
    WHERE status = 'active';

COMMENT ON TABLE monitoring_sessions IS 'One detector monitoring run for a trip. Latest snapshots/frames stay in backend memory, not in this table.';

-- ============================================================================
-- SAFETY EVENTS
-- ============================================================================

CREATE TABLE safety_events (
    safety_event_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              VARCHAR(100) NOT NULL UNIQUE,
    monitoring_session_id UUID,
    trip_id               UUID REFERENCES trips(trip_id) ON DELETE SET NULL,
    driver_id             UUID REFERENCES drivers(driver_id) ON DELETE SET NULL,
    vehicle_id            UUID REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    event_type            safety_event_type NOT NULL,
    severity              event_severity NOT NULL DEFAULT 'medium',
    source                VARCHAR(100) NOT NULL DEFAULT 'ai_camera',
    detection_method      detection_method,
    occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    confidence            NUMERIC(5,4) NOT NULL,
    duration_ms           INTEGER NOT NULL DEFAULT 0,

    ear_value             NUMERIC(5,3),
    mar_value             NUMERIC(5,3),
    pitch_value           NUMERIC(6,2),
    drowsiness_score      NUMERIC(5,2),
    cnn_label             VARCHAR(50),
    cnn_confidence        NUMERIC(5,4),

    evidence_frame_path   TEXT,
    snapshot_ref          TEXT,
    details               JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_safety_events_confidence
        CHECK (confidence BETWEEN 0 AND 1),
    CONSTRAINT chk_safety_events_duration_ms
        CHECK (duration_ms >= 0),
    CONSTRAINT chk_safety_events_ear
        CHECK (ear_value IS NULL OR ear_value >= 0),
    CONSTRAINT chk_safety_events_mar
        CHECK (mar_value IS NULL OR mar_value >= 0),
    CONSTRAINT chk_safety_events_drowsiness_score
        CHECK (drowsiness_score IS NULL OR drowsiness_score BETWEEN 0 AND 100),
    CONSTRAINT chk_safety_events_cnn_confidence
        CHECK (cnn_confidence IS NULL OR cnn_confidence BETWEEN 0 AND 1),
    CONSTRAINT fk_safety_events_monitoring_session_trip
        FOREIGN KEY (monitoring_session_id, trip_id)
        REFERENCES monitoring_sessions(monitoring_session_id, trip_id)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TRIGGER trg_safety_events_immutable
    BEFORE UPDATE ON safety_events
    FOR EACH ROW EXECUTE FUNCTION prevent_safety_event_update();

COMMENT ON TABLE safety_events IS 'Immutable AI/business safety facts detected during monitoring.';
COMMENT ON COLUMN safety_events.evidence_frame_path IS 'Path to selected evidence frame only. Do not store every camera frame in PostgreSQL.';
COMMENT ON COLUMN safety_events.snapshot_ref IS 'Optional reference to a captured metrics snapshot or object storage record.';

-- ============================================================================
-- ALERTS
-- ============================================================================

CREATE TABLE alerts (
    alert_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id           UUID REFERENCES trips(trip_id) ON DELETE SET NULL,
    driver_id         UUID REFERENCES drivers(driver_id) ON DELETE SET NULL,
    vehicle_id        UUID REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    status            alert_status NOT NULL DEFAULT 'open',
    severity          alert_severity NOT NULL DEFAULT 'warning',
    alert_type        alert_type NOT NULL,
    title             VARCHAR(200) NOT NULL,
    message           TEXT,

    opened_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at   TIMESTAMPTZ,
    acknowledged_by   UUID REFERENCES users(user_id) ON DELETE SET NULL,
    resolved_at       TIMESTAMPTZ,
    resolved_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,
    escalated_at      TIMESTAMPTZ,
    ignored_at        TIMESTAMPTZ,
    lifecycle_note    TEXT,

    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_alerts_acknowledged_fields
        CHECK (
            (status <> 'acknowledged')
            OR acknowledged_at IS NOT NULL
        ),
    CONSTRAINT chk_alerts_resolved_fields
        CHECK (
            (status <> 'resolved')
            OR resolved_at IS NOT NULL
        ),
    CONSTRAINT chk_alerts_ignored_fields
        CHECK (
            (status <> 'ignored')
            OR ignored_at IS NOT NULL
        ),
    CONSTRAINT chk_alerts_escalated_fields
        CHECK (
            (status <> 'escalated')
            OR escalated_at IS NOT NULL
        )
);

CREATE TRIGGER trg_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE alerts IS 'Actionable notification generated from one or more safety events.';

-- Link table because one alert can summarize multiple raw safety events.
CREATE TABLE alert_safety_events (
    alert_id        UUID NOT NULL REFERENCES alerts(alert_id) ON DELETE CASCADE,
    safety_event_id UUID NOT NULL REFERENCES safety_events(safety_event_id) ON DELETE CASCADE,
    PRIMARY KEY (alert_id, safety_event_id)
);

COMMENT ON TABLE alert_safety_events IS 'Many-to-many link between actionable alerts and immutable safety events.';

-- ============================================================================
-- SAFETY SCORES
-- ============================================================================

CREATE TABLE safety_scores (
    safety_score_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id             UUID NOT NULL UNIQUE REFERENCES trips(trip_id) ON DELETE CASCADE,
    score               NUMERIC(5,2) NOT NULL,
    grade               safety_grade NOT NULL,
    total_events        INTEGER NOT NULL DEFAULT 0,
    warning_events      INTEGER NOT NULL DEFAULT 0,
    critical_events     INTEGER NOT NULL DEFAULT 0,
    alert_count         INTEGER NOT NULL DEFAULT 0,
    calculation_version VARCHAR(30) NOT NULL DEFAULT 'v1',
    explanation         JSONB NOT NULL,
    calculated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_safety_scores_score
        CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT chk_safety_scores_counts
        CHECK (
            total_events >= 0
            AND warning_events >= 0
            AND critical_events >= 0
            AND alert_count >= 0
            AND warning_events + critical_events <= total_events
        )
);

COMMENT ON TABLE safety_scores IS 'Explainable rule-based safety score calculated when a trip completes.';
COMMENT ON COLUMN safety_scores.explanation IS 'JSON explanation such as base score, penalties, event counts, and final score.';

-- ============================================================================
-- DETECTOR SETTINGS
-- ============================================================================
-- Supporting table for the existing architecture. It is intentionally simple and
-- can be used by the backend to return effective detector settings to the AI
-- runtime. This is not live telemetry storage.

CREATE TABLE settings (
    setting_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope                      settings_scope NOT NULL DEFAULT 'global',
    driver_id                  UUID REFERENCES drivers(driver_id) ON DELETE CASCADE,

    ear_threshold              NUMERIC(5,3) NOT NULL DEFAULT 0.30,
    ear_consec_frames          INTEGER NOT NULL DEFAULT 15,
    cnn_confidence_threshold   NUMERIC(5,4) NOT NULL DEFAULT 0.80,
    preferred_detection_method detection_method NOT NULL DEFAULT 'combined',
    alarm_audio_file           VARCHAR(100) NOT NULL DEFAULT 'alarm.wav',
    alert_cooldown_seconds     INTEGER NOT NULL DEFAULT 10,
    enable_no_face_alert       BOOLEAN NOT NULL DEFAULT true,
    no_face_timeout_seconds    INTEGER NOT NULL DEFAULT 5,
    camera_index               INTEGER NOT NULL DEFAULT 0,
    frame_width                INTEGER NOT NULL DEFAULT 640,
    frame_height               INTEGER NOT NULL DEFAULT 480,
    warning_alert_penalty      NUMERIC(5,2) NOT NULL DEFAULT 3,
    critical_alert_penalty     NUMERIC(5,2) NOT NULL DEFAULT 8,
    safety_grade_a_min_score   NUMERIC(5,2) NOT NULL DEFAULT 85,
    safety_grade_b_min_score   NUMERIC(5,2) NOT NULL DEFAULT 60,
    extra_config               JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_settings_scope
        CHECK (
            (scope = 'global' AND driver_id IS NULL)
            OR (scope = 'driver' AND driver_id IS NOT NULL)
        ),
    CONSTRAINT chk_settings_thresholds
        CHECK (
            ear_threshold >= 0
            AND ear_consec_frames > 0
            AND cnn_confidence_threshold BETWEEN 0 AND 1
            AND alert_cooldown_seconds >= 0
            AND no_face_timeout_seconds >= 0
            AND camera_index >= 0
            AND frame_width > 0
            AND frame_height > 0
            AND warning_alert_penalty >= 0
            AND critical_alert_penalty >= 0
            AND safety_grade_a_min_score BETWEEN 0 AND 100
            AND safety_grade_b_min_score BETWEEN 0 AND 100
            AND safety_grade_a_min_score >= safety_grade_b_min_score
        ),
    CONSTRAINT uq_settings_driver UNIQUE (driver_id)
);

CREATE UNIQUE INDEX uq_settings_single_global
    ON settings ((scope = 'global'))
    WHERE scope = 'global';

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE VIEW effective_driver_settings AS
SELECT
    d.driver_id,
    COALESCE(ds.ear_threshold, g.ear_threshold) AS ear_threshold,
    COALESCE(ds.ear_consec_frames, g.ear_consec_frames) AS ear_consec_frames,
    COALESCE(ds.cnn_confidence_threshold, g.cnn_confidence_threshold) AS cnn_confidence_threshold,
    COALESCE(ds.preferred_detection_method, g.preferred_detection_method) AS preferred_detection_method,
    COALESCE(ds.alarm_audio_file, g.alarm_audio_file) AS alarm_audio_file,
    COALESCE(ds.alert_cooldown_seconds, g.alert_cooldown_seconds) AS alert_cooldown_seconds,
    COALESCE(ds.enable_no_face_alert, g.enable_no_face_alert) AS enable_no_face_alert,
    COALESCE(ds.no_face_timeout_seconds, g.no_face_timeout_seconds) AS no_face_timeout_seconds,
    COALESCE(ds.camera_index, g.camera_index) AS camera_index,
    COALESCE(ds.frame_width, g.frame_width) AS frame_width,
    COALESCE(ds.frame_height, g.frame_height) AS frame_height,
    COALESCE(ds.warning_alert_penalty, g.warning_alert_penalty) AS warning_alert_penalty,
    COALESCE(ds.critical_alert_penalty, g.critical_alert_penalty) AS critical_alert_penalty,
    COALESCE(ds.safety_grade_a_min_score, g.safety_grade_a_min_score) AS safety_grade_a_min_score,
    COALESCE(ds.safety_grade_b_min_score, g.safety_grade_b_min_score) AS safety_grade_b_min_score,
    COALESCE(ds.extra_config, g.extra_config) AS extra_config
FROM drivers d
LEFT JOIN settings ds
    ON ds.driver_id = d.driver_id
    AND ds.scope = 'driver'
CROSS JOIN LATERAL (
    SELECT *
    FROM settings
    WHERE scope = 'global'
    LIMIT 1
) g;

COMMENT ON TABLE settings IS 'Detector and scoring settings consumed through backend APIs by the AI runtime.';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_users_status
    ON users(status);

CREATE INDEX idx_drivers_status
    ON drivers(status);

CREATE INDEX idx_driver_sessions_driver_status
    ON driver_sessions(driver_id, status);

CREATE INDEX idx_vehicles_status
    ON vehicles(status);

CREATE INDEX idx_trips_status
    ON trips(status);

CREATE INDEX idx_trips_created_by
    ON trips(created_by);

CREATE INDEX idx_trips_planned_start
    ON trips(planned_start_at);

CREATE INDEX idx_trip_assignments_trip
    ON trip_assignments(trip_id);

CREATE INDEX idx_trip_assignments_driver
    ON trip_assignments(driver_id);

CREATE INDEX idx_trip_assignments_vehicle
    ON trip_assignments(vehicle_id);

CREATE INDEX idx_monitoring_sessions_trip
    ON monitoring_sessions(trip_id);

CREATE INDEX idx_monitoring_sessions_driver_session
    ON monitoring_sessions(driver_session_id);

CREATE INDEX idx_safety_events_monitoring_session
    ON safety_events(monitoring_session_id);

CREATE INDEX idx_safety_events_event_id
    ON safety_events(event_id);

CREATE INDEX idx_safety_events_trip_time
    ON safety_events(trip_id, occurred_at DESC);

CREATE INDEX idx_safety_events_driver_time
    ON safety_events(driver_id, occurred_at DESC);

CREATE INDEX idx_safety_events_vehicle_time
    ON safety_events(vehicle_id, occurred_at DESC);

CREATE INDEX idx_safety_events_type_time
    ON safety_events(event_type, occurred_at DESC);

CREATE INDEX idx_safety_events_severity_time
    ON safety_events(severity, occurred_at DESC);

CREATE INDEX idx_safety_events_metadata_gin
    ON safety_events USING GIN (metadata);

CREATE INDEX idx_safety_events_details_gin
    ON safety_events USING GIN (details);

CREATE INDEX idx_alerts_trip_status
    ON alerts(trip_id, status);

CREATE INDEX idx_alerts_status_severity
    ON alerts(status, severity);

CREATE INDEX idx_alerts_opened_at
    ON alerts(opened_at DESC);

CREATE INDEX idx_alerts_acknowledged_by
    ON alerts(acknowledged_by);

CREATE INDEX idx_alerts_resolved_by
    ON alerts(resolved_by);

CREATE INDEX idx_alert_safety_events_safety_event
    ON alert_safety_events(safety_event_id);

CREATE INDEX idx_settings_driver_id
    ON settings(driver_id);

-- ============================================================================
-- DEMO SEED DATA
-- ============================================================================

INSERT INTO users (full_name, email, role)
VALUES ('Demo Admin', 'admin@example.com', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO settings (scope)
VALUES ('global')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STATE TRANSITION NOTES
-- ============================================================================
-- Trip:
--   draft -> scheduled -> assigned -> in_progress -> completed
--   draft/scheduled/assigned -> cancelled
--   in_progress -> aborted
--
-- DriverSession:
--   active -> ended
--   active -> expired
--
-- TripAssignment:
--   assigned -> in_progress -> completed
--   assigned -> cancelled/released
--   in_progress -> released
--
-- MonitoringSession:
--   active -> ended
--   active -> failed
--
-- SafetyEvent:
--   insert only; immutable after creation
--
-- Alert:
--   open -> acknowledged/escalated/resolved/ignored
--   acknowledged -> escalated/resolved/ignored
--   escalated -> acknowledged/resolved
--   resolved and ignored are terminal states
--
-- Enforce complex transition order in the backend service layer. The database
-- enforces structural validity, ownership, uniqueness, and simple lifecycle
-- consistency.
-- ============================================================================
