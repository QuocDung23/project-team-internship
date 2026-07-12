import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSafetySummaryFromTrips,
  deriveDriverStatuses,
  mapBackendDriverToDriver,
  mapBackendTripToVehicle,
  normalizeBackendSettings,
  startMyTrip,
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
  assert.equal(driver.status, "idle");
  assert.equal(driver.totalAlerts, 2);
});

test("derives driver display statuses from active trips and availability", () => {
  const drivers = [
    mapBackendDriverToDriver({
      driver_id: "driver-1",
      full_name: "Driving Driver",
      license_number: "LIC-1",
      status: "active",
    }),
    mapBackendDriverToDriver({
      driver_id: "driver-2",
      full_name: "Idle Driver",
      license_number: "LIC-2",
      status: "active",
    }),
    mapBackendDriverToDriver({
      driver_id: "driver-3",
      full_name: "Disabled Driver",
      license_number: "LIC-3",
      status: "suspended",
    }),
  ];

  const next = deriveDriverStatuses(drivers, [
    {
      trip_id: "trip-1",
      status: "in_progress",
      driver_id: "driver-1",
    },
  ]);

  assert.equal(next[0].status, "driving");
  assert.equal(next[1].status, "idle");
  assert.equal(next[2].status, "disable");
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

test("builds average safety summary from enriched trips", () => {
  const summary = buildSafetySummaryFromTrips([
    {
      trip_id: "trip-1",
      status: "completed",
      total_alerts_count: 3,
      critical_alerts_count: 1,
      safety_score: {
        safety_score_id: "score-1",
        trip_id: "trip-1",
        score: 90,
        grade: "A",
        total_events: 3,
        warning_events: 2,
        critical_events: 1,
        alert_count: 3,
        calculation_version: "v1",
        explanation: {},
        calculated_at: "2026-07-12T08:00:00Z",
      },
    },
    {
      trip_id: "trip-2",
      status: "completed",
      total_alerts_count: 1,
      critical_alerts_count: 0,
      safety_score: {
        safety_score_id: "score-2",
        trip_id: "trip-2",
        score: 80,
        grade: "B",
        total_events: 1,
        warning_events: 1,
        critical_events: 0,
        alert_count: 1,
        calculation_version: "v1",
        explanation: {},
        calculated_at: "2026-07-12T09:00:00Z",
      },
    },
    {
      trip_id: "trip-3",
      status: "in_progress",
      total_alerts_count: 2,
      critical_alerts_count: 1,
    },
  ]);

  assert.equal(summary.averageScore, 85);
  assert.equal(summary.scoredTrips, 2);
  assert.equal(summary.totalAlerts, 6);
  assert.equal(summary.criticalAlerts, 2);
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

test("startMyTrip sends optional trip fields", async () => {
  let request;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ trip_id: "trip-1", status: "in_progress" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await startMyTrip({
      code: "DEMO-001",
      origin: "Garage",
      destination: "Depot",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(request.url, "/api/v1/trips/start-my-trip");
  assert.equal(request.init.method, "POST");
  assert.deepEqual(JSON.parse(request.init.body), {
    code: "DEMO-001",
    origin: "Garage",
    destination: "Depot",
  });
});
