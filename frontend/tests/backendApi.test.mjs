import assert from "node:assert/strict";
import test from "node:test";

import {
  mapBackendDriverToDriver,
  mapBackendTripToVehicle,
  normalizeBackendSettings,
} from "../src/app/services/backendApi.ts";

test("maps backend driver object into dashboard driver model", () => {
  const driver = mapBackendDriverToDriver({
    driver_id: "driver-1",
    full_name: "Nguyen Van A",
    phone: "0900000000",
    license_number: "GPLX-1",
    status: "active",
    baseline_ear: 0.31,
    total_alerts_count: 2,
  });

  assert.equal(driver.id, "driver-1");
  assert.equal(driver.name, "Nguyen Van A");
  assert.equal(driver.phone, "0900000000");
  assert.equal(driver.status, "active");
  assert.equal(driver.totalAlerts, 2);
});

test("maps backend active trip into fleet vehicle snapshot", () => {
  const vehicle = mapBackendTripToVehicle({
    trip_id: "trip-1",
    driver_id: "driver-1",
    driver_name: "Tran Van B",
    vehicle_plate: "51H-123.45",
    status: "in_progress",
    total_alerts_count: 3,
    start_time: "2026-07-05T10:00:00Z",
  });

  assert.equal(vehicle.id, "trip-1");
  assert.equal(vehicle.driverName, "Tran Van B");
  assert.equal(vehicle.licensePlate, "51H-123.45");
  assert.equal(vehicle.status, "in_transit");
});

test("normalizes backend settings with schema field names", () => {
  const settings = normalizeBackendSettings({
    ear_threshold: "0.27",
    ear_consec_frames: "18",
    cnn_confidence_threshold: "0.82",
    alarm_audio_file: "alarm.wav",
  });

  assert.equal(settings.ear_threshold, 0.27);
  assert.equal(settings.ear_consec_frames, 18);
  assert.equal(settings.cnn_confidence_threshold, 0.82);
  assert.equal(settings.alarm_audio_file, "alarm.wav");
});
