// Container for the driver monitoring console. Owns all state: tick interval,
// mock metrics snapshot/series, and derived status values. Renders the layout
// shell and delegates pure UI to child components.

import { useEffect, useState } from "react";
import {
  getMockMetrics,
  tickMockMetrics,
  bucket,
  bucketReverse,
  bucketAbs,
  overall,
  statusWord,
  dwsStatusFn,
  dwsLabelFn,
  type DriverSnapshot,
} from "../data/mockMetrics";
import { seedDrivers } from "../data/seed";
import { useTicker } from "../hook/useTicker";
import { DriverHeader } from "../component/monitoring/DriverHeader";
import { CabinCam } from "../component/monitoring/CabinCam";
import { MetricCard } from "../component/monitoring/MetricCard";
import { HeadFaceCard } from "../component/monitoring/HeadFaceCard";
import { MetricTimeline } from "../component/monitoring/MetricTimeline";
import { AlertLog } from "../component/monitoring/AlertLog";
import type { Driver } from "../types";

export function MonitoringView() {
  const driver: Driver = seedDrivers()[0]!;
  const bundle = getMockMetrics();

  const [series, setSeries] = useState(bundle.series);
  const [snap, setSnap] = useState<DriverSnapshot>(bundle.snapshot);

  // Sync time for formatAgo in AlertLog. Runs every 1s so the "Xm trước"
  // labels stay current without a full re-tick.
  const now = useTicker(1000);

  // Drive the mock telemetry feed at the same cadence as the real backend.
  useTicker(2200);
  useEffect(() => {
    const id = window.setInterval(() => {
      tickMockMetrics();
      setSnap(getMockMetrics().snapshot);
      setSeries({ ...getMockMetrics().series });
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  // Derived metrics.
  const earStatus = bucket(snap.ear, 0.22, 0.16);
  const marStatus = bucketReverse(snap.mar, 0.55, 0.70);
  const pitchStatus = bucketAbs(snap.pitch, 20, 28);
  const headStatus = overall(snap);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <DriverHeader
        driver={driver}
        route="Sài Gòn → Vũng Tàu · QL51"
        status={headStatus}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Left column: camera, timeline, alerts */}
        <div className="flex flex-col gap-4">
          <CabinCam
            eyesOpen={snap.eyesOpen}
            mouthClosed={snap.mouthClosed}
            onPhone={snap.onPhone}
            seatbelt={snap.seatbelt}
          />
          <MetricTimeline series={series} />
          <AlertLog alerts={bundle.alerts} now={now} />
        </div>

        {/* Right column: metric tiles */}
        <div className="flex flex-col gap-4">
          <MetricCard
            label="EAR"
            value={snap.ear.toFixed(2)}
            status={earStatus}
            statusLabel={statusWord(earStatus)}
            thresholds={{ warn: 0.22, critical: 0.16 }}
            range={{ min: 0.08, max: 0.34 }}
            hint="Tỉ lệ khép mở mắt. Thấp = buồn ngủ."
          />
          <MetricCard
            label="MAR"
            value={snap.mar.toFixed(2)}
            status={marStatus}
            statusLabel={statusWord(marStatus)}
            thresholds={{ warn: 0.55, critical: 0.70 }}
            higherIsWorse
            range={{ min: 0.10, max: 0.85 }}
            hint="Tỉ lệ mở miệng. Cao = ngáp."
          />
          <MetricCard
            label="DWS Score"
            value={String(snap.dwsScore)}
            unit="/100"
            status={dwsStatusFn(snap.dwsScore)}
            statusLabel={dwsLabelFn(snap.dwsScore)}
            thresholds={{ warn: 60, critical: 40 }}
            higherIsWorse
            range={{ min: 0, max: 100 }}
            hint="Chỉ số tổng hợp trạng thái lái xe."
          />
          <MetricCard
            label="Pitch"
            value={snap.pitch.toFixed(1)}
            unit="°"
            status={pitchStatus}
            statusLabel={statusWord(pitchStatus)}
            thresholds={{ warn: 20, critical: 28 }}
            higherIsWorse
            range={{ min: -25, max: 35 }}
            hint="Góc nghiêng đầu so với trục lái."
          />
          <HeadFaceCard
            eyesOpen={snap.eyesOpen}
            mouthClosed={snap.mouthClosed}
            onPhone={snap.onPhone}
            seatbelt={snap.seatbelt}
            status={headStatus}
          />
        </div>
      </div>

      <footer className="mt-2 flex items-center justify-between border-t border-hairline pt-3 text-[11px] text-zinc-500">
        <span>
          Sentinel Fleet Console · v0.4 · Cập nhật mỗi 2.2s từ central backend (mock)
        </span>
        <span className="font-mono-num">
          {new Date().toLocaleTimeString("vi-VN")}
        </span>
      </footer>
    </div>
  );
}