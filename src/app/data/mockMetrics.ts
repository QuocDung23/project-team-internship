export type MetricKind = "ear" | "mar" | "pitch";
export type MetricStatus = "active" | "warn" | "critical";

export interface MetricSample {
  ts: number;
  value: number;
}

export interface MetricSeries {
  kind: MetricKind;
  unit: string;
  samples: MetricSample[];
}

export interface DriverSnapshot {
  ts: number;
  ear: number;
  mar: number;
  pitch: number;
  dwsScore: number;
  status: MetricStatus;
  eyesOpen: boolean;
  mouthClosed: boolean;
  onPhone: boolean;
  seatbelt: boolean;
}

const SERIES_CAPACITY = 60; // ~2 phút ở tần suất 2s

const RANGES = {
  ear: { min: 0.08, max: 0.34, base: 0.28, warn: 0.22, critical: 0.16 },
  mar: { min: 0.1, max: 0.85, base: 0.42, warn: 0.55, critical: 0.7 },
  pitch: { min: -25, max: 35, base: 12, warn: 20, critical: 28 },
} as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function jitter(value: number, magnitude: number): number {
  return value + (Math.random() - 0.5) * magnitude;
}

function statusFor(kind: MetricKind, value: number): MetricStatus {
  const r = RANGES[kind];
  if (value <= r.critical) return "critical";
  if (value <= r.warn) return "warn";
  return "active";
}

function nextValue(kind: MetricKind, current: number): number {
  const r = RANGES[kind];
  const drift = kind === "pitch" ? 1.4 : 0.02;
  let next = jitter(current, drift);
  // Periodic drift toward critical so the demo occasionally surfaces an alert.
  if (Math.random() > 0.92) {
    next = r.critical + Math.random() * 0.02;
  } else if (Math.random() > 0.85) {
    next = r.warn - 0.01 - Math.random() * 0.04;
  }
  return clamp(Number(next.toFixed(3)), r.min, r.max);
}

function makeSeries(
  kind: MetricKind,
  unit: string,
  seed: number,
): MetricSeries {
  const r = RANGES[kind];
  const now = Date.now();
  const samples: MetricSample[] = [];
  let value: number = r.base;
  for (let i = SERIES_CAPACITY - 1; i >= 0; i--) {
    value = nextValue(kind, value);
    samples.push({ ts: now - i * 2000 + (seed % 7) * 137, value });
  }
  return { kind, unit, samples };
}

export interface MockMetricsBundle {
  snapshot: DriverSnapshot;
  series: Record<MetricKind, MetricSeries>;
  alerts: MockAlert[];
}

export interface MockAlert {
  id: string;
  ts: number;
  severity: "warn" | "critical";
  title: string;
  detail: string;
}

// ─── Fleet-level mock data ───────────────────────────────────────────────────

export interface VehicleQueueStats {
  waitingCount: number;
  loadingCount: number;
  transitCount: number;
  completedToday: number;
  avgWaitMinutes: number;
  queueByTeam: Record<string, number>;
}

export interface FleetKpi {
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  maintenanceVehicles: number;
  todayTrips: number;
  totalDistanceKm: number;
  fuelLitersUsed: number;
  avgSpeedKmh: number;
}

export interface VehicleSnapshot {
  id: string;
  driverId: string;
  driverName: string;
  licensePlate: string;
  team: string;
  status: "waiting" | "loading" | "in_transit" | "idle" | "maintenance";
  waitMinutes: number;
  loadProgress: number; // 0-100
  speedKmh: number;
  fuelPercent: number;
  engineTemp: number;
  lastUpdate: number;
}

// ─── Alert builder ────────────────────────────────────────────────────────────

const ALERT_POOL = [
  {
    severity: "warn" as const,
    title: "Buồn ngủ nhẹ",
    detailFn: () =>
      `EAR = ${(0.17 + Math.random() * 0.05).toFixed(2)} trong 2.1s liên tục`,
  },
  {
    severity: "warn" as const,
    title: "Nghiêng đầu",
    detailFn: () =>
      `Pitch = ${(20 + Math.random() * 5).toFixed(1)}° lệch trục lái`,
  },
  {
    severity: "warn" as const,
    title: "Mắt hơi khép",
    detailFn: () =>
      `EAR = ${(0.19 + Math.random() * 0.03).toFixed(2)} giảm dần`,
  },
  {
    severity: "warn" as const,
    title: "Hao hụt tập trung",
    detailFn: () =>
      `MAR = ${(0.53 + Math.random() * 0.04).toFixed(2)} vượt ngưỡng cảnh báo`,
  },
  {
    severity: "warn" as const,
    title: "Ngáp liên tục",
    detailFn: () =>
      `MAR = ${(0.56 + Math.random() * 0.05).toFixed(2)} 3 lần trong 30s`,
  },
  {
    severity: "critical" as const,
    title: "Buồn ngủ nghiêm trọng",
    detailFn: () =>
      `EAR = ${(0.12 + Math.random() * 0.03).toFixed(2)} dưới ngưỡng nguy hiểm`,
  },
  {
    severity: "critical" as const,
    title: "Ngáp kéo dài",
    detailFn: () =>
      `MAR = ${(0.68 + Math.random() * 0.06).toFixed(2)} vượt ngưỡng 1.8s`,
  },
  {
    severity: "critical" as const,
    title: "Mất tập trung",
    detailFn: () =>
      `Pitch = ${(26 + Math.random() * 4).toFixed(1)}° kéo dài 3.2s`,
  },
  {
    severity: "critical" as const,
    title: "Mắt nhắm hoàn toàn",
    detailFn: () =>
      `EAR = ${(0.09 + Math.random() * 0.03).toFixed(2)} trong 4.5s`,
  },
  {
    severity: "warn" as const,
    title: "Tốc độ giảm bất thường",
    detailFn: () => `Xe giảm tốc 40% trong 10s`,
  },
  {
    severity: "warn" as const,
    title: "Phanh gấp",
    detailFn: () => `Gia tốc -0.8g phát hiện`,
  },
  {
    severity: "critical" as const,
    title: "Lệch làn đường",
    detailFn: () => `Xe vượt làn 2.3s liên tục`,
  },
  {
    severity: "warn" as const,
    title: "Dừng đỗ bất thường",
    detailFn: () => `Dừng giữa đường 45s`,
  },
  {
    severity: "critical" as const,
    title: "Khói động cơ",
    detailFn: () =>
      `Nhiệt độ động cơ ${(95 + Math.random() * 10).toFixed(0)}°C`,
  },
  {
    severity: "warn" as const,
    title: "Cảnh báo va chạm",
    detailFn: () =>
      `Khoảng cách ${(15 + Math.random() * 10).toFixed(0)}m với xe trước`,
  },
  {
    severity: "critical" as const,
    title: "Trễ phát hiện",
    detailFn: () => `Phản ứng chậm 1.2s với xe trước`,
  },
];

let _alertCounter = 2500;

function nextAlertId(): string {
  return `A-${_alertCounter++}`;
}

function randomAlert(pool = ALERT_POOL): MockAlert {
  const tpl = pool[Math.floor(Math.random() * pool.length)]!;
  return {
    id: nextAlertId(),
    ts: Date.now() - Math.floor(Math.random() * 180_000),
    severity: tpl.severity,
    title: tpl.title,
    detail: tpl.detailFn(),
  };
}

function buildAlerts(): MockAlert[] {
  const baseAlerts: MockAlert[] = [
    {
      id: "A-2401",
      ts: Date.now() - 12_000,
      severity: "warn",
      title: "Buồn ngủ nhẹ",
      detail: "EAR = 0.19 trong 2.1s liên tục",
    },
    {
      id: "A-2400",
      ts: Date.now() - 45_000,
      severity: "critical",
      title: "Ngáp kéo dài",
      detail: "MAR = 0.71 vượt ngưỡng 1.8s",
    },
    {
      id: "A-2399",
      ts: Date.now() - 96_000,
      severity: "warn",
      title: "Nghiêng đầu",
      detail: "Pitch = 22.4° lệch trục lái",
    },
  ];
  const extras: MockAlert[] = [];
  for (let i = 0; i < 8; i++) {
    extras.push(randomAlert());
  }
  return [...baseAlerts, ...extras].sort((a, b) => b.ts - a.ts);
}

// ─── Vehicle queue mock data ─────────────────────────────────────────────────

const TEAMS = ["Khu vực 1", "Khu vực 2", "Khu vực 3"];

function randomVehicle(index: number): VehicleSnapshot {
  const statusSeq: VehicleSnapshot["status"][] = [
    "waiting",
    "loading",
    "in_transit",
    "idle",
    "maintenance",
  ];
  const status = statusSeq[index % statusSeq.length]!;
  const team = TEAMS[index % TEAMS.length]!;
  const names = [
    "Nguyễn Minh Quân",
    "Trần Văn Khoa",
    "Lê Hoàng Anh",
    "Phạm Quốc Bảo",
    "Đặng Thanh Tùng",
    "Võ Đình Khang",
    "Bùi Ngọc Huy",
    "Hoàng Gia Khang",
    "Ngô Trung Kiên",
    "Đỗ Phú Thịnh",
    "Lý Hải Đăng",
    "Phan Bảo Long",
  ];
  const plates = [
    "51H-287.41",
    "51F-902.16",
    "50L-318.55",
    "60A-117.29",
    "51C-746.10",
    "50K-552.77",
    "61B-204.83",
    "51H-660.32",
    "60C-498.61",
    "50G-119.44",
    "61A-077.15",
    "51E-833.26",
  ];
  return {
    id: `V-${1041 + index}`,
    driverId: `D-${1041 + index}`,
    driverName: names[index % names.length]!,
    licensePlate: plates[index % plates.length]!,
    team,
    status,
    waitMinutes: status === "waiting" ? Math.floor(Math.random() * 45) + 5 : 0,
    loadProgress: status === "loading" ? Math.floor(Math.random() * 100) : 0,
    speedKmh:
      status === "in_transit"
        ? Math.floor(Math.random() * 40) + 30
        : status === "idle"
          ? 0
          : status === "maintenance"
            ? 0
            : Math.floor(Math.random() * 20),
    fuelPercent: Math.floor(Math.random() * 60) + 40,
    engineTemp:
      status === "maintenance"
        ? 98 + Math.floor(Math.random() * 15)
        : 75 + Math.floor(Math.random() * 15),
    lastUpdate: Date.now() - Math.floor(Math.random() * 60_000),
  };
}

function buildVehicleQueue(): VehicleSnapshot[] {
  return Array.from({ length: 12 }, (_, i) => randomVehicle(i));
}

function buildVehicleQueueStats(
  vehicles: VehicleSnapshot[],
): VehicleQueueStats {
  const waitingCount = vehicles.filter((v) => v.status === "waiting").length;
  const loadingCount = vehicles.filter((v) => v.status === "loading").length;
  const transitCount = vehicles.filter((v) => v.status === "in_transit").length;
  const completedToday = Math.floor(Math.random() * 80) + 120;
  const avgWaitMinutes =
    waitingCount > 0
      ? Math.round(
          vehicles
            .filter((v) => v.status === "waiting")
            .reduce((s, v) => s + v.waitMinutes, 0) / waitingCount,
        )
      : 0;
  const queueByTeam: Record<string, number> = {};
  vehicles.forEach((v) => {
    if (v.status === "waiting" || v.status === "loading") {
      queueByTeam[v.team] = (queueByTeam[v.team] ?? 0) + 1;
    }
  });
  return {
    waitingCount,
    loadingCount,
    transitCount,
    completedToday,
    avgWaitMinutes,
    queueByTeam,
  };
}

function buildFleetKpi(): FleetKpi {
  return {
    totalVehicles: 12,
    activeVehicles: Math.floor(Math.random() * 3) + 8,
    idleVehicles: Math.floor(Math.random() * 2) + 1,
    maintenanceVehicles: Math.floor(Math.random() * 2),
    todayTrips: Math.floor(Math.random() * 40) + 80,
    totalDistanceKm: Math.round((Math.random() * 200 + 400) * 10) / 10,
    fuelLitersUsed: Math.round(Math.random() * 300 + 500),
    avgSpeedKmh: Math.round(Math.random() * 15 + 35),
  };
}

// ─── Live fleet events for AlertsPage ────────────────────────────────────────

export interface MockFleetEvent {
  id: string;
  type:
    | "drowsiness_alert"
    | "yawn_alert"
    | "distraction_alert"
    | "speed_alert"
    | "collision_warning"
    | "lane_departure";
  driverId: string;
  driverName: string;
  licensePlate: string;
  ear: number;
  timestamp: number;
  acknowledged: boolean;
  severity: "warn" | "critical";
  location: string;
}

const ALERT_TYPE_LABELS: MockFleetEvent["type"][] = [
  "drowsiness_alert",
  "yawn_alert",
  "distraction_alert",
  "speed_alert",
  "collision_warning",
  "lane_departure",
];

const LOCATIONS = [
  "Đại lộ Thống Nhất, Q. Bình Thạnh",
  "Nguyễn Trãi, Q. 1",
  "Võ Văn Kiệt, Q. 5",
  "Cát Lái, Q. 2",
  "Quang Trung, Q. Gò Vấp",
  "Phạm Văn Đồng, Q. Thủ Đức",
  "Nam Kỳ Khởi Nghĩa, Q. 3",
  "Lý Thường Kiệt, Q. 10",
];

function buildFleetEvents(): MockFleetEvent[] {
  const drivers = [
    { id: "D-1041", name: "Nguyễn Minh Quân", plate: "51H-287.41" },
    { id: "D-1042", name: "Trần Văn Khoa", plate: "51F-902.16" },
    { id: "D-1043", name: "Lê Hoàng Anh", plate: "50L-318.55" },
    { id: "D-1044", name: "Phạm Quốc Bảo", plate: "60A-117.29" },
    { id: "D-1045", name: "Đặng Thanh Tùng", plate: "51C-746.10" },
    { id: "D-1046", name: "Võ Đình Khang", plate: "50K-552.77" },
    { id: "D-1047", name: "Bùi Ngọc Huy", plate: "61B-204.83" },
    { id: "D-1048", name: "Hoàng Gia Khang", plate: "51H-660.32" },
    { id: "D-1049", name: "Ngô Trung Kiên", plate: "60C-498.61" },
    { id: "D-1050", name: "Đỗ Phú Thịnh", plate: "50G-119.44" },
    { id: "D-1051", name: "Lý Hải Đăng", plate: "61A-077.15" },
    { id: "D-1052", name: "Phan Bảo Long", plate: "51E-833.26" },
  ];

  let eventCounter = 5001;
  const earValues = [0.14, 0.16, 0.18, 0.21, 0.24, 0.27];

  return Array.from({ length: 18 }, (_, i) => {
    const driver = drivers[i % drivers.length]!;
    const type = ALERT_TYPE_LABELS[i % ALERT_TYPE_LABELS.length]!;
    const severity: "critical" | "warn" =
      i % 5 === 0 || i % 7 === 0 ? "critical" : "warn";
    return {
      id: `EVT-${eventCounter++}`,
      type,
      driverId: driver.id,
      driverName: driver.name,
      licensePlate: driver.plate,
      ear: earValues[i % earValues.length]!,
      timestamp: Date.now() - (i * 8_000 + Math.floor(Math.random() * 5_000)),
      acknowledged: i > 12,
      severity,
      location: LOCATIONS[i % LOCATIONS.length]!,
    };
  }).sort((a, b) => b.timestamp - a.timestamp);
}

let _vehicleCache: VehicleSnapshot[] | null = null;
let _queueStatsCache: VehicleQueueStats | null = null;
let _fleetKpiCache: FleetKpi | null = null;
let _fleetEventsCache: MockFleetEvent[] | null = null;

export function getVehicleQueue(): VehicleSnapshot[] {
  if (!_vehicleCache) _vehicleCache = buildVehicleQueue();
  return _vehicleCache;
}

export function getVehicleQueueStats(): VehicleQueueStats {
  if (!_queueStatsCache)
    _queueStatsCache = buildVehicleQueueStats(getVehicleQueue());
  return _queueStatsCache;
}

export function getFleetKpi(): FleetKpi {
  if (!_fleetKpiCache) _fleetKpiCache = buildFleetKpi();
  return _fleetKpiCache;
}

export function getFleetEvents(): MockFleetEvent[] {
  if (!_fleetEventsCache) _fleetEventsCache = buildFleetEvents();
  return _fleetEventsCache;
}

export function refreshFleetEvents(): MockFleetEvent[] {
  _fleetEventsCache = null;
  return getFleetEvents();
}

let bundle: MockMetricsBundle | null = null;

function dwsScore(snap: DriverSnapshot): number {
  // Trọng số cố định cho demo. Thực tế sẽ do model backend trả.
  const earPart = clamp((snap.ear - 0.1) / 0.22, 0, 1) * 40;
  const marPart = clamp(1 - (snap.mar - 0.1) / 0.65, 0, 1) * 30;
  const pitchPart = clamp(1 - Math.abs(snap.pitch) / 30, 0, 1) * 20;
  const phonePenalty = snap.onPhone ? -10 : 0;
  return Math.round(earPart + marPart + pitchPart + phonePenalty);
}

function buildSnapshot(
  series: Record<MetricKind, MetricSeries>,
): DriverSnapshot {
  const earLast = series.ear.samples.at(-1);
  const marLast = series.mar.samples.at(-1);
  const pitchLast = series.pitch.samples.at(-1);
  const ear = earLast?.value ?? 0.28;
  const mar = marLast?.value ?? 0.42;
  const pitch = pitchLast?.value ?? 12;
  const eyesOpen = ear > 0.18;
  const mouthClosed = mar < 0.55;
  const onPhone = Math.random() > 0.92;
  const seatbelt = true;
  const status: MetricStatus =
    statusFor("ear", ear) === "critical" ||
    statusFor("mar", mar) === "critical" ||
    statusFor("pitch", pitch) === "critical"
      ? "critical"
      : statusFor("ear", ear) === "warn" ||
          statusFor("mar", mar) === "warn" ||
          statusFor("pitch", pitch) === "warn"
        ? "warn"
        : "active";
  const snap: DriverSnapshot = {
    ts: Date.now(),
    ear,
    mar,
    pitch,
    dwsScore: 0,
    status,
    eyesOpen,
    mouthClosed,
    onPhone,
    seatbelt,
  };
  snap.dwsScore = dwsScore(snap);
  return snap;
}

export function getMockMetrics(): MockMetricsBundle {
  if (bundle) return bundle;
  const series: Record<MetricKind, MetricSeries> = {
    ear: makeSeries("ear", "", 1),
    mar: makeSeries("mar", "", 3),
    pitch: makeSeries("pitch", "°", 5),
  };
  const snapshot = buildSnapshot(series);
  bundle = { snapshot, series, alerts: buildAlerts() };
  return bundle;
}

// Tick the simulation forward. Returns the fresh snapshot and mutates series in place.
export function tickMockMetrics(): DriverSnapshot {
  if (!bundle) getMockMetrics();
  const b = bundle!;
  const ts = Date.now();
  (["ear", "mar", "pitch"] as MetricKind[]).forEach((kind) => {
    const s = b.series[kind];
    const lastVal = s.samples.at(-1)?.value;
    if (lastVal === undefined) return;
    s.samples.push({ ts, value: nextValue(kind, lastVal) });
    if (s.samples.length > SERIES_CAPACITY) s.samples.shift();
  });
  b.snapshot = buildSnapshot(b.series);
  return b.snapshot;
}

// --- Status derivation helpers (locked to the same threshold table used in
// the metric cards so the right rail and timeline never disagree).

export type S = DriverSnapshot["status"];

export function bucket(value: number, warn: number, critical: number): S {
  if (value <= critical) return "critical";
  if (value <= warn) return "warn";
  return "active";
}

export function bucketReverse(
  value: number,
  warn: number,
  critical: number,
): S {
  if (value >= critical) return "critical";
  if (value >= warn) return "warn";
  return "active";
}

export function bucketAbs(value: number, warn: number, critical: number): S {
  const abs = Math.abs(value);
  if (abs >= critical) return "critical";
  if (abs >= warn) return "warn";
  return "active";
}

export function overall(s: DriverSnapshot): S {
  const rules: S[] = [
    bucket(s.ear, 0.22, 0.16),
    bucketReverse(s.mar, 0.55, 0.7),
    bucketAbs(s.pitch, 20, 28),
  ];
  if (rules.includes("critical") || s.onPhone) return "critical";
  if (rules.includes("warn")) return "warn";
  return "active";
}

export function statusWord(s: S): string {
  switch (s) {
    case "active":
      return "Bình thường";
    case "warn":
      return "Cảnh báo";
    case "critical":
      return "Nguy hiểm";
  }
}

export function dwsStatusFn(score: number): S {
  if (score < 40) return "critical";
  if (score < 60) return "warn";
  return "active";
}

export function dwsLabelFn(score: number): string {
  if (score < 40) return "Nguy hiểm";
  if (score < 60) return "Cần chú ý";
  if (score < 80) return "Ổn định";
  return "An toàn";
}
