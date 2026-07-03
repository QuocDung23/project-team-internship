import type {
  AlertType,
  Driver,
  DriverStatus,
  FleetEvent,
  SocketEnvelope,
} from "../types";
import { EYE_CLOSED_EAR, EYE_OPEN_EAR, seedDrivers } from "../data/seed";

type Listener<T> = (payload: T) => void;

interface SocketService {
  connect: () => void;
  disconnect: () => void;
  onTelemetry: (cb: Listener<Driver>) => void;
  onEvent: (cb: Listener<FleetEvent>) => void;
  forceCriticalEvent: () => void;
  forceOfflineDriver: (id: string) => void;
  isConnected: () => boolean;
}

const VEHICLE_NAMES = [
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

function statusFromEar(
  ear: number,
  eyeState: Driver["eyeState"],
): DriverStatus {
  if (eyeState === "closed" && ear < 0.18) return "critical";
  if (eyeState === "yawning") return "warn";
  if (ear < 0.22) return "warn";
  return "active";
}

function jitter(value: number, magnitude: number): number {
  return value + (Math.random() - 0.5) * magnitude;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function createService(): SocketService {
  let drivers: Driver[] = seedDrivers();
  let connected = false;
  const telemetryListeners = new Set<Listener<Driver>>();
  const eventListeners = new Set<Listener<FleetEvent>>();

  // Drift the simulated EAR over time and force occasional alert events.
  const telemetryInterval = window.setInterval(() => {
    if (!connected || drivers.length === 0) return;
    const idx = Math.floor(Math.random() * drivers.length);
    const target = drivers[idx];
    if (!target || target.status === "offline") return;

    const drift = (Math.random() - 0.45) * 0.06;
    let nextEar = clamp(target.ear + drift, 0.08, EYE_OPEN_EAR + 0.05);
    let nextEyeState: Driver["eyeState"] = target.eyeState;

    if (nextEar < 0.16 && Math.random() > 0.6) {
      nextEyeState = "closed";
      nextEar = EYE_CLOSED_EAR + Math.random() * 0.02;
    } else if (Math.random() > 0.94) {
      nextEyeState = "yawning";
      nextEar = 0.21 + Math.random() * 0.03;
    } else if (nextEyeState !== "open" && nextEar > 0.24) {
      nextEyeState = "open";
    }

    const nextStatus = statusFromEar(nextEar, nextEyeState);
    const updated: Driver = {
      ...target,
      ear: Number(nextEar.toFixed(3)),
      eyeState: nextEyeState,
      status: nextStatus,
      position: {
        lat: jitter(target.position.lat, 0.0008),
        lng: jitter(target.position.lng, 0.0008),
      },
      lastUpdate: Date.now(),
      totalAlerts: target.totalAlerts + (nextStatus === "critical" ? 1 : 0),
    };
    drivers = drivers.map((d) => (d.id === updated.id ? updated : d));

    telemetryListeners.forEach((cb) => cb(updated));

    if (updated.status === "critical" && Math.random() > 0.55) {
      emitAlert(updated, "drowsiness_alert");
    } else if (updated.eyeState === "yawning" && Math.random() > 0.78) {
      emitAlert(updated, "yawn_alert");
    }
  }, 2200);

  function emitAlert(driver: Driver, type: AlertType): void {
    const ev: FleetEvent = {
      id: `${driver.id}-${Date.now()}`,
      type,
      driverId: driver.id,
      driverName: driver.name,
      licensePlate: driver.licensePlate,
      ear: driver.ear,
      timestamp: Date.now(),
      acknowledged: false,
    };
    eventListeners.forEach((cb) => cb(ev));
  }

  return {
    connect(): void {
      connected = true;
    },
    disconnect(): void {
      connected = false;
      window.clearInterval(telemetryInterval);
    },
    onTelemetry(cb): void {
      telemetryListeners.add(cb);
    },
    onEvent(cb): void {
      eventListeners.add(cb);
    },
    forceCriticalEvent(): void {
      const candidate =
        drivers.find((d) => d.status === "critical") ??
        drivers[Math.floor(Math.random() * drivers.length)];
      if (!candidate) return;
      const forced: Driver = {
        ...candidate,
        ear: EYE_CLOSED_EAR,
        eyeState: "closed",
        status: "critical",
        lastUpdate: Date.now(),
        totalAlerts: candidate.totalAlerts + 1,
      };
      drivers = drivers.map((d) => (d.id === forced.id ? forced : d));
      telemetryListeners.forEach((cb) => cb(forced));
      emitAlert(forced, "drowsiness_alert");
    },
    forceOfflineDriver(id: string): void {
      const target = drivers.find((d) => d.id === id);
      if (!target) return;
      const updated: Driver = {
        ...target,
        status: "offline",
        lastUpdate: Date.now(),
      };
      drivers = drivers.map((d) => (d.id === id ? updated : d));
      telemetryListeners.forEach((cb) => cb(updated));
    },
    isConnected(): boolean {
      return connected;
    },
  };
}

let singleton: SocketService | null = null;

export function getSocket(): SocketService {
  if (!singleton) singleton = createService();
  return singleton;
}

// Suppress unused names warning (kept for parity with backend driver roster).
export const _vehicleRoster = VEHICLE_NAMES;
export type { SocketEnvelope };
