import type { Landmark, MeshGroup } from "../../utils/faceMesh";

interface DriverSilhouetteProps {
  jitterX: number;
  jitterY: number;
}

export function DriverSilhouette({ jitterX, jitterY }: DriverSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 1280 720"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {/* Cabin interior gradient (seat, headrest) */}
      <defs>
        <radialGradient id="cabin-glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#1f2a3a" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#10151c" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#070a0f" stopOpacity="1" />
        </radialGradient>
        <linearGradient id="seat-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1f28" />
          <stop offset="100%" stopColor="#0d1116" />
        </linearGradient>
      </defs>

      <rect width="1280" height="720" fill="url(#cabin-glow)" />

      {/* Headrest behind the driver */}
      <g transform={`translate(${jitterX * 0.3} ${jitterY * 0.2})`}>
        <ellipse cx="640" cy="320" rx="200" ry="260" fill="url(#seat-grad)" />
      </g>

      {/* Driver silhouette (head + shoulders) */}
      <g transform={`translate(${jitterX} ${jitterY})`}>
        {/* Shoulders */}
        <path
          d="M 320 720 L 360 560 Q 480 500 640 500 Q 800 500 920 560 L 960 720 Z"
          fill="#1c232c"
          stroke="#2a3441"
          strokeWidth={1.5}
        />
        {/* Neck */}
        <rect x="600" y="460" width="80" height="80" fill="#0f141a" />
        {/* Head */}
        <ellipse cx="640" cy="320" rx="140" ry="170" fill="#1a2129" stroke="#2c3744" strokeWidth={1.5} />
        {/* Hair shadow */}
        <path
          d="M 500 250 Q 640 130 780 250 Q 770 220 640 200 Q 510 220 500 250 Z"
          fill="#0c1116"
        />
      </g>
    </svg>
  );
}

export function CornerMarkers() {
  const common = "absolute h-5 w-5 border-yellow-400/70";
  return (
    <>
      <span className={`${common} left-3 top-3 border-l-2 border-t-2`} />
      <span className={`${common} right-3 top-3 border-r-2 border-t-2`} />
      <span className={`${common} bottom-3 left-3 border-b-2 border-l-2`} />
      <span className={`${common} bottom-3 right-3 border-b-2 border-r-2`} />
    </>
  );
}

interface StatusPipProps {
  label: string;
  active: boolean;
  okLabel: string;
  badLabel: string;
}

export function StatusPip({ label, active, okLabel, badLabel }: StatusPipProps) {
  return (
    <span
      className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ${
        active
          ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20"
          : "bg-rose-400/10 text-rose-300 ring-rose-400/20"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-rose-400"}`}
        aria-hidden
      />
      <span className="text-zinc-400">{label}</span>
      <span>{active ? okLabel : badLabel}</span>
    </span>
  );
}

interface FaceMeshOverlayProps {
  landmarks: Landmark[];
  groups: MeshGroup[];
  jitterX: number;
  jitterY: number;
  FRAME_W: number;
  FRAME_H: number;
  CX_FACE: number;
  CY_FACE: number;
}

export function FaceMeshOverlay({
  landmarks,
  groups,
  jitterX,
  jitterY,
  FRAME_W,
  FRAME_H,
  CX_FACE,
  CY_FACE,
}: FaceMeshOverlayProps) {
  const buildSegments = (gs: MeshGroup[]): string => {
    return gs
      .map((g) => {
        const pts = g.ring.map((i) => {
          const lm = landmarks[i];
          if (!lm) return "0,0";
          return `${(lm.x * FRAME_W).toFixed(1)},${(lm.y * FRAME_H).toFixed(1)}`;
        });
        const segs = (g.segments ?? [])
          .map(([a, b]) => {
            const la = landmarks[a];
            const lb = landmarks[b];
            if (!la || !lb) return "";
            return `M ${(la.x * FRAME_W).toFixed(1)},${(la.y * FRAME_H).toFixed(1)} L ${(lb.x * FRAME_W).toFixed(1)},${(lb.y * FRAME_H).toFixed(1)}`;
          })
          .join(" ");
        return `<polyline points="${pts.join(" ")}" /> ${segs}`;
      })
      .join(" ");
  };

  const segments = buildSegments(groups);

  return (
    <svg
      viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <g
        transform={`translate(${jitterX} ${jitterY})`}
        fill="none"
        stroke="#facc15"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
        dangerouslySetInnerHTML={{ __html: segments }}
      />
      {/* Landmark dots */}
      <g transform={`translate(${jitterX} ${jitterY})`}>
        {landmarks.map((lm, i) => (
          <circle
            key={i}
            cx={lm.x * FRAME_W}
            cy={lm.y * FRAME_H}
            r={i % 4 === 0 ? 4 : 2.5}
            fill="#facc15"
            stroke="#0a0e14"
            strokeWidth={1}
          />
        ))}
      </g>

      {/* Live EAR / MAR / PITCH labels overlaid near face */}
      <g transform={`translate(${jitterX} ${jitterY})`}>
        <text
          x={CX_FACE * FRAME_W + 70}
          y={(CY_FACE - 0.22) * FRAME_H}
          fill="#facc15"
          fontSize={26}
          fontFamily="ui-monospace, monospace"
          fontWeight={600}
        >
          EAR 0.27
        </text>
        <text
          x={CX_FACE * FRAME_W + 70}
          y={(CY_FACE - 0.05) * FRAME_H}
          fill="#facc15"
          fontSize={26}
          fontFamily="ui-monospace, monospace"
          fontWeight={600}
        >
          MAR 0.45
        </text>
        <text
          x={CX_FACE * FRAME_W + 70}
          y={(CY_FACE + 0.12) * FRAME_H}
          fill="#facc15"
          fontSize={26}
          fontFamily="ui-monospace, monospace"
          fontWeight={600}
        >
          PITCH 12.3°
        </text>
      </g>
    </svg>
  );
}