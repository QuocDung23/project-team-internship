-- ============================================================================
-- CƠ SỞ DỮ LIỆU: Hệ thống Phát hiện Buồn ngủ & Quản lý An toàn Chuyến đi
-- (Real-time Driver Drowsiness Detection & Trip Safety Management)
--
-- Thiết kế bám theo pipeline nhận dạng trong repo ngochoai0810/ML
-- (dựa trên Driver-Drowsiness-Detector của mohitwildbeast), gồm 2 phương pháp
-- phát hiện song song:
--   1) EAR (Eye Aspect Ratio) qua dlib 68-landmark + Haar cascades
--      -> face_and_eye_detector_*.py, drowsiness_detect.py
--      -> ngưỡng EAR + số khung hình liên tiếp mắt nhắm -> phát âm báo động (audio/)
--   2) CNN phân loại mắt mở/nhắm (collect_data.py -> train_cnn.py -> integrate_cnn.py)
--      -> trả về nhãn (drowsy/alert) kèm độ tin cậy (confidence)
--
-- PostgreSQL 14+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- cho gen_random_uuid()

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

CREATE TYPE trip_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'emergency_stopped'   -- dừng khẩn do cảnh báo buồn ngủ nghiêm trọng liên tục
);

CREATE TYPE detection_method AS ENUM (
    'ear_dlib',        -- Eye Aspect Ratio (dlib landmarks / Haar cascade)
    'cnn_classifier',  -- CNN train_cnn.py / integrate_cnn.py
    'manual'           -- tài xế/giám sát viên tự báo cáo
);

CREATE TYPE alert_type AS ENUM (
    'eyes_closed',        -- EAR dưới ngưỡng đủ số khung hình liên tiếp
    'drowsy_cnn',          -- CNN phân loại "drowsy"
    'no_face_detected',    -- không phát hiện khuôn mặt (camera che, tài xế quay đi)
    'yawning',              -- ngáp (mở rộng, nếu bật)
    'head_nod',              -- gật đầu / mất tư thế đầu (mở rộng)
    'distraction'            -- mất tập trung (mở rộng)
);

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

CREATE TYPE settings_scope AS ENUM ('global', 'driver');

-- ============================================================================
-- FUNCTION dùng chung: tự động cập nhật cột updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- BẢNG: drivers (tài xế)
-- ============================================================================

CREATE TABLE drivers (
    driver_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(150) NOT NULL,
    license_number      VARCHAR(50) UNIQUE NOT NULL,
    phone               VARCHAR(20),
    email               VARCHAR(150),
    date_of_birth       DATE,
    gender              gender_type,
    profile_photo_path  TEXT,            -- ảnh khuôn mặt chuẩn (dùng làm tham chiếu/calibration)
    baseline_ear        NUMERIC(5,3),    -- EAR trung bình khi mắt mở bình thường của tài xế (calibration)
    status               driver_status NOT NULL DEFAULT 'active',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_drivers_status ON drivers(status);

COMMENT ON TABLE drivers IS 'Thông tin tài xế và thông số hiệu chỉnh (calibration) cho phát hiện buồn ngủ';
COMMENT ON COLUMN drivers.baseline_ear IS 'EAR nền tham chiếu khi mắt mở bình thường, dùng để cá nhân hoá ngưỡng cảnh báo';

-- ============================================================================
-- BẢNG: trips (chuyến đi)
-- ============================================================================

CREATE TABLE trips (
    trip_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id               UUID NOT NULL REFERENCES drivers(driver_id) ON DELETE RESTRICT,
    vehicle_plate           VARCHAR(20),
    start_time               TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time                 TIMESTAMPTZ,
    start_latitude           NUMERIC(9,6),
    start_longitude          NUMERIC(9,6),
    end_latitude              NUMERIC(9,6),
    end_longitude              NUMERIC(9,6),
    distance_km                NUMERIC(8,2),
    status                       trip_status NOT NULL DEFAULT 'scheduled',
    total_alerts_count            INTEGER NOT NULL DEFAULT 0,
    critical_alerts_count         INTEGER NOT NULL DEFAULT 0,
    avg_drowsiness_score          NUMERIC(5,2), -- điểm buồn ngủ trung bình toàn chuyến (0-100)
    safety_score                    NUMERIC(5,2), -- điểm an toàn 0-100, tính khi kết thúc chuyến (xem API tính điểm)
    safety_grade                     CHAR(1),      -- xếp hạng 'A' / 'B' / 'C' suy ra từ safety_score
    notes                          TEXT,
    created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_trip_time CHECK (end_time IS NULL OR end_time >= start_time),
    CONSTRAINT chk_trip_safety_grade CHECK (safety_grade IS NULL OR safety_grade IN ('A','B','C'))
);

CREATE TRIGGER trg_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_start_time ON trips(start_time);

COMMENT ON TABLE trips IS 'Mỗi chuyến đi của một tài xế, tổng hợp số liệu an toàn theo thời gian thực';

-- ============================================================================
-- BẢNG: alerts (cảnh báo) - log từng sự kiện phát hiện buồn ngủ/bất thường
-- ============================================================================

CREATE TABLE alerts (
    alert_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id                   UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    driver_id                  UUID NOT NULL REFERENCES drivers(driver_id) ON DELETE RESTRICT,

    alert_type                   alert_type NOT NULL,
    severity                      alert_severity NOT NULL DEFAULT 'warning',
    detection_method               detection_method NOT NULL,

    -- Thông số riêng cho phương pháp EAR (drowsiness_detect.py)
    ear_value                        NUMERIC(5,3),   -- giá trị EAR đo được tại thời điểm cảnh báo
    consecutive_frame_count           INTEGER,        -- số khung hình liên tiếp mắt nhắm vượt ngưỡng

    -- Thông số riêng cho phương pháp CNN (integrate_cnn.py)
    cnn_confidence                     NUMERIC(5,4),  -- độ tin cậy phân loại (0-1)
    cnn_label                            VARCHAR(20), -- ví dụ: 'drowsy' / 'alert'

    captured_frame_path                  TEXT,        -- đường dẫn ảnh chụp tại thời điểm cảnh báo
    latitude                              NUMERIC(9,6),
    longitude                              NUMERIC(9,6),

    alarm_triggered                         BOOLEAN NOT NULL DEFAULT false,  -- có phát âm thanh cảnh báo (audio/) không
    alarm_audio_file                          VARCHAR(100),

    acknowledged                               BOOLEAN NOT NULL DEFAULT false, -- tài xế/hệ thống đã xác nhận
    acknowledged_at                             TIMESTAMPTZ,

    occurred_at                                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at                                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_trip_id ON alerts(trip_id);
CREATE INDEX idx_alerts_driver_id ON alerts(driver_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_occurred_at ON alerts(occurred_at);

COMMENT ON TABLE alerts IS 'Log từng sự kiện cảnh báo buồn ngủ/mất an toàn, gắn với phương pháp phát hiện cụ thể (EAR hoặc CNN)';
COMMENT ON COLUMN alerts.ear_value IS 'Chỉ có giá trị khi detection_method = ear_dlib';
COMMENT ON COLUMN alerts.cnn_confidence IS 'Chỉ có giá trị khi detection_method = cnn_classifier';

-- Trigger: tự động tăng bộ đếm cảnh báo trên bảng trips khi có alert mới
CREATE OR REPLACE FUNCTION bump_trip_alert_counters()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE trips
    SET total_alerts_count = total_alerts_count + 1,
        critical_alerts_count = critical_alerts_count + CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
        updated_at = now()
    WHERE trip_id = NEW.trip_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alerts_bump_counters
    AFTER INSERT ON alerts
    FOR EACH ROW EXECUTE FUNCTION bump_trip_alert_counters();

-- ============================================================================
-- BẢNG: settings (cài đặt) - tham số hệ thống, có thể global hoặc theo tài xế
-- ============================================================================

CREATE TABLE settings (
    setting_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope                       settings_scope NOT NULL DEFAULT 'global',
    driver_id                     UUID REFERENCES drivers(driver_id) ON DELETE CASCADE,  -- NULL nếu scope = global

    -- Ngưỡng EAR (tương đương EYE_ASPECT_RATIO_THRESHOLD trong drowsiness_detect.py)
    ear_threshold                    NUMERIC(5,3) NOT NULL DEFAULT 0.30,
    ear_consec_frames                  INTEGER NOT NULL DEFAULT 15,  -- EYE_ASPECT_RATIO_CONSEC_FRAMES

    -- Cấu hình CNN
    cnn_confidence_threshold             NUMERIC(5,4) NOT NULL DEFAULT 0.80,

    preferred_detection_method             detection_method NOT NULL DEFAULT 'ear_dlib',

    -- Cảnh báo & âm thanh
    alarm_audio_file                          VARCHAR(100) NOT NULL DEFAULT 'alarm.wav', -- file trong thư mục audio/
    alert_cooldown_seconds                      INTEGER NOT NULL DEFAULT 10,  -- tránh spam cảnh báo liên tục
    enable_no_face_alert                          BOOLEAN NOT NULL DEFAULT true,
    no_face_timeout_seconds                        INTEGER NOT NULL DEFAULT 5,

    -- Cấu hình camera / thiết bị
    camera_index                                     INTEGER NOT NULL DEFAULT 0,
    frame_width                                        INTEGER NOT NULL DEFAULT 640,
    frame_height                                        INTEGER NOT NULL DEFAULT 480,

    -- Cấu hình tính điểm an toàn A/B/C khi kết thúc chuyến đi (xem API trips/end)
    warning_alert_penalty                                     NUMERIC(5,2) NOT NULL DEFAULT 3,   -- điểm trừ / cảnh báo mức warning
    critical_alert_penalty                                     NUMERIC(5,2) NOT NULL DEFAULT 8,  -- điểm trừ / cảnh báo mức critical
    safety_grade_a_min_score                                    NUMERIC(5,2) NOT NULL DEFAULT 85, -- score >= 85 -> A
    safety_grade_b_min_score                                    NUMERIC(5,2) NOT NULL DEFAULT 60, -- 60 <= score < 85 -> B, < 60 -> C

    -- Cấu hình mở rộng linh hoạt, không cần đổi schema khi thêm tham số mới
    extra_config                                          JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at                                               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                                               TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_settings_scope CHECK (
        (scope = 'global' AND driver_id IS NULL) OR
        (scope = 'driver' AND driver_id IS NOT NULL)
    ),
    CONSTRAINT uq_settings_driver UNIQUE (driver_id)  -- mỗi tài xế chỉ có 1 bộ cài đặt riêng
);

CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Đảm bảo chỉ có duy nhất 1 bản ghi settings scope = global
CREATE UNIQUE INDEX uq_settings_single_global
    ON settings ((scope = 'global'))
    WHERE scope = 'global';

CREATE INDEX idx_settings_driver_id ON settings(driver_id);

COMMENT ON TABLE settings IS 'Tham số cấu hình phát hiện buồn ngủ; scope=global là mặc định hệ thống, scope=driver ghi đè riêng cho từng tài xế';

-- Seed: cài đặt mặc định toàn hệ thống
INSERT INTO settings (scope, ear_threshold, ear_consec_frames, alarm_audio_file)
VALUES ('global', 0.30, 15, 'alarm.wav');

-- ============================================================================
-- VIEW tiện ích: cài đặt hiệu lực cho từng tài xế (ưu tiên settings riêng,
-- fallback về global nếu tài xế chưa có cài đặt riêng)
-- ============================================================================

CREATE VIEW effective_driver_settings AS
SELECT
    d.driver_id,
    COALESCE(ds.ear_threshold, g.ear_threshold)               AS ear_threshold,
    COALESCE(ds.ear_consec_frames, g.ear_consec_frames)         AS ear_consec_frames,
    COALESCE(ds.cnn_confidence_threshold, g.cnn_confidence_threshold) AS cnn_confidence_threshold,
    COALESCE(ds.preferred_detection_method, g.preferred_detection_method) AS preferred_detection_method,
    COALESCE(ds.alarm_audio_file, g.alarm_audio_file)           AS alarm_audio_file,
    COALESCE(ds.alert_cooldown_seconds, g.alert_cooldown_seconds) AS alert_cooldown_seconds
FROM drivers d
LEFT JOIN settings ds ON ds.driver_id = d.driver_id AND ds.scope = 'driver'
CROSS JOIN LATERAL (
    SELECT * FROM settings WHERE scope = 'global' LIMIT 1
) g;

-- ============================================================================
-- VIEW tiện ích: tổng quan an toàn theo chuyến đi
-- ============================================================================

CREATE VIEW trip_safety_summary AS
SELECT
    t.trip_id,
    t.driver_id,
    dr.full_name,
    t.status,
    t.start_time,
    t.end_time,
    t.total_alerts_count,
    t.critical_alerts_count,
    t.avg_drowsiness_score,
    COUNT(a.alert_id) FILTER (WHERE a.alert_type = 'eyes_closed')     AS eyes_closed_events,
    COUNT(a.alert_id) FILTER (WHERE a.alert_type = 'no_face_detected') AS no_face_events
FROM trips t
JOIN drivers dr ON dr.driver_id = t.driver_id
LEFT JOIN alerts a ON a.trip_id = t.trip_id
GROUP BY t.trip_id, t.driver_id, dr.full_name, t.status, t.start_time, t.end_time,
         t.total_alerts_count, t.critical_alerts_count, t.avg_drowsiness_score;

-- ============================================================================
-- GHI CHÚ THIẾT KẾ
-- ============================================================================
-- 1. drivers.baseline_ear cho phép cá nhân hoá ngưỡng EAR thay vì dùng hằng số
--    cứng như trong drowsiness_detect.py gốc.
-- 2. alerts tách riêng cột cho 2 phương pháp phát hiện (EAR vs CNN) để không
--    phải dùng JSONB cho dữ liệu có cấu trúc rõ ràng, nhưng vẫn có extra_config
--    JSONB ở settings cho các tham số mở rộng trong tương lai (vd: MAR ngáp,
--    head-pose, camera thứ 2...).
-- 3. Trigger bump_trip_alert_counters giữ trips luôn có số liệu tổng hợp cập
--    nhật realtime mà không cần tính lại COUNT() mỗi lần truy vấn dashboard.
-- 4. Có thể mở rộng thêm bảng vehicles, users/admin (giám sát viên), và bảng
--    audit_log nếu cần phân quyền/kiểm toán chi tiết hơn.
-- ============================================================================
