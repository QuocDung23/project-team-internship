import { motion } from "motion/react";
import type { MetricSeries, MetricStatus } from "../../data/mockMetrics";

interface MetricTimelineProps {
  series: Record<"ear" | "mar" | "pitch", MetricSeries>;
}

const W = 800;
const H = 200;
const PAD_L = 38;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 22;

interface Lane {
  key: "ear" | "mar" | "pitch";
  label: string;
  unit: string;
  color: string;
  range: { min: number; max: number };
  higherIsWorse: boolean;
  warn: number;
  critical: number;
  status: MetricStatus;
}

export function MetricTimeline({ series }: MetricTimelineProps) {
  const lanes: Lane[] = [
    {
      key: "ear",
      label: "EAR",
      unit: "",
      color: "#34d399",
      range: { min: 0.08, max: 0.34 },
      higherIsWorse: false,
      warn: 0.22,
      critical: 0.16,
      status: statusOf(series.ear),
    },
    {
      key: "mar",
      label: "MAR",
      unit: "",
      color: "#fbbf24",
      range: { min: 0.1, max: 0.85 },
      higherIsWorse: true,
      warn: 0.55,
      critical: 0.7,
      status: statusOf(series.mar),
    },
    {
      key: "pitch",
      label: "PITCH",
      unit: "°",
      color: "#60a5fa",
      range: { min: -25, max: 35 },
      higherIsWorse: true,
      warn: 20,
      critical: 28,
      status: statusOf(series.pitch),
    },
  ];

  const innerW = W - PAD_L - PAD_R;
  const laneH = (H - PAD_T - PAD_B) / lanes.length;

  return (
    <section className="panel px-4 py-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold tracking-tight text-zinc-100">
            Diễn biến 2 phút gần nhất
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Ngưỡng cảnh báo hiển thị bằng vạch vàng, ngưỡng nguy hiểm bằng vạch
            đỏ
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-zinc-500">
          <Legend dot="bg-amber-400" label="Warn" />
          <Legend dot="bg-rose-400" label="Critical" />
        </div>
      </header>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[200px] w-full"
          preserveAspectRatio="none"
        >
          {/* Background grid */}
          {lanes.map((_, li) => {
            const y0 = PAD_T + li * laneH;
            return (
              <g key={`grid-${li}`}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={y0 + laneH}
                  y2={y0 + laneH}
                  stroke="#1f2630"
                  strokeWidth={1}
                />
                {li === 0 && (
                  <line
                    x1={PAD_L}
                    x2={PAD_L}
                    y1={PAD_T}
                    y2={H - PAD_B}
                    stroke="#1f2630"
                    strokeWidth={1}
                  />
                )}
              </g>
            );
          })}

          {/* Each lane: label, threshold lines, polyline */}
          {lanes.map((lane, li) => {
            const y0 = PAD_T + li * laneH;
            const samples = series[lane.key].samples;
            const n = samples.length;
            const points = samples.map((s, i) => {
              const x = PAD_L + (i / Math.max(1, n - 1)) * innerW;
              const norm = clamp01(
                (s.value - lane.range.min) / (lane.range.max - lane.range.min),
              );
              const y = y0 + (1 - norm) * laneH;
              return { x, y };
            });
            const path = points
              .map(
                (p, i) =>
                  `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
              )
              .join(" ");
            const areaPath =
              `${path} L ${points[points.length - 1]!.x.toFixed(1)} ${(y0 + laneH).toFixed(1)}` +
              ` L ${points[0]!.x.toFixed(1)} ${(y0 + laneH).toFixed(1)} Z`;

            const warnY =
              y0 +
              (1 -
                clamp01(
                  (lane.warn - lane.range.min) /
                    (lane.range.max - lane.range.min),
                )) *
                laneH;
            const critY =
              y0 +
              (1 -
                clamp01(
                  (lane.critical - lane.range.min) /
                    (lane.range.max - lane.range.min),
                )) *
                laneH;

            return (
              <g key={lane.key}>
                {/* Threshold markers */}
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={warnY}
                  y2={warnY}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.5}
                />
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={critY}
                  y2={critY}
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.55}
                />

                {/* Filled area under curve */}
                <motion.path
                  d={areaPath}
                  fill={lane.color}
                  opacity={0.08}
                  initial={false}
                  animate={{ d: areaPath }}
                  transition={{ type: "tween", duration: 0.4 }}
                />

                {/* Line */}
                <motion.path
                  d={path}
                  fill="none"
                  stroke={lane.color}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={false}
                  animate={{ d: path }}
                  transition={{ type: "tween", duration: 0.4 }}
                />

                {/* Last point dot */}
                {points.length > 0 && (
                  <circle
                    cx={points[points.length - 1]!.x}
                    cy={points[points.length - 1]!.y}
                    r={3}
                    fill={lane.color}
                  />
                )}

                {/* Lane label */}
                <text
                  x={6}
                  y={y0 + laneH / 2 + 4}
                  fill="#7d8590"
                  fontSize={10}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={600}
                  letterSpacing={0.5}
                >
                  {lane.label}
                </text>
                <text
                  x={6}
                  y={y0 + laneH / 2 + 16}
                  fill="#5a626d"
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                >
                  {samples[n - 1]?.value.toFixed(2)}
                  {lane.unit}
                </text>
              </g>
            );
          })}

          {/* X-axis ticks (every 30s) */}
          {([-120, -90, -60, -30, 0] as const).map((sec, i) => {
            const x = PAD_L + ((sec + 120) / 120) * innerW;
            return (
              <g key={i}>
                <line
                  x1={x}
                  x2={x}
                  y1={H - PAD_B}
                  y2={H - PAD_B + 4}
                  stroke="#2a3340"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={H - PAD_B + 14}
                  textAnchor="middle"
                  fill="#5a626d"
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                >
                  {sec === 0 ? "now" : `${sec}s`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}

function statusOf(s: MetricSeries): MetricStatus {
  const last = s.samples[s.samples.length - 1];
  if (!last) return "active";
  if (s.kind === "ear") {
    if (last.value <= 0.16) return "critical";
    if (last.value <= 0.22) return "warn";
    return "active";
  }
  if (s.kind === "mar") {
    if (last.value >= 0.7) return "critical";
    if (last.value >= 0.55) return "warn";
    return "active";
  }
  // pitch
  if (last.value >= 28 || last.value <= -20) return "critical";
  if (last.value >= 20 || last.value <= -15) return "warn";
  return "active";
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
