import { useAuth } from "../auth/AuthContext";
import { useBackendDrivers, useBackendMonitoring, useBackendTrips, useMyDriverProfile } from "../hook/useBackendData";
import { getActiveTripId } from "../services/backendAlerts";
import { DriverHeader } from "../component/monitoring/DriverHeader";
import { CabinCam } from "../component/monitoring/CabinCam";
import { overall, type MetricStatus } from "../types/monitoring";
import type { Driver } from "../types";

export function MonitoringView() {
  const { user } = useAuth();
  const monitoring = useBackendMonitoring();
  const backendDrivers = useBackendDrivers(user?.role === "admin");
  const myDriver = useMyDriverProfile(user?.role === "driver");
  const backendTrips = useBackendTrips(true);
  const detectorTripId = monitoring.raw?.trip_id || "";
  const liveTripId = detectorTripId || getActiveTripId();
  const activeTrip = backendTrips.trips?.find((trip) => trip.trip_id === liveTripId) ?? null;
  const driver: Driver | null = activeTrip
    ? backendDrivers.drivers?.find((candidate) => candidate.id === activeTrip.driver_id) ?? myDriver.driver
    : myDriver.driver;
  const snap = monitoring.snap;
  const headStatus = snap ? overall(snap) : ("active" as MetricStatus);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <DriverHeader
        driver={driver}
        route={activeTrip?.vehicle_plate ? `Xe ${activeTrip.vehicle_plate}` : "Detector stream"}
        status={headStatus}
      />

      {!snap && (
        <section className="panel border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Waiting for integrate_cnn.py to publish the first frame and metrics.
          {monitoring.error ? <span className="ml-2 text-amber-300">{monitoring.error}</span> : null}
        </section>
      )}

      <CabinCam streamUrl={monitoring.streamUrl} hasSnapshot={Boolean(snap)} />

      <section className="panel mx-auto grid w-full max-w-[640px] grid-cols-2 gap-3 px-4 py-3 text-sm sm:grid-cols-5">
        <Metric label="FPS" value={snap?.fps ? snap.fps.toFixed(1) : "--"} />
        <Metric label="EAR" value={snap ? snap.ear.toFixed(3) : "--"} />
        <Metric label="MAR" value={snap ? snap.mar.toFixed(3) : "--"} />
        <Metric label="Pitch" value={snap ? snap.pitch.toFixed(1) : "--"} />
        <Metric label="DWS" value={snap ? `${snap.dwsScore}%` : "--"} />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 font-mono-num text-lg font-semibold text-zinc-100">{value}</p>
    </div>
  );
}
