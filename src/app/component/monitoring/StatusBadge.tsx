import type { MetricStatus } from "../../data/mockMetrics";

type Tone = MetricStatus | "neutral";

const TONE: Record<
  Tone,
  { fg: string; bg: string; ring: string; dot: string }
> = {
  active: {
    fg: "text-emerald-400",
    bg: "bg-emerald-400/10",
    ring: "ring-emerald-400/20",
    dot: "bg-emerald-400",
  },
  warn: {
    fg: "text-amber-400",
    bg: "bg-amber-400/10",
    ring: "ring-amber-400/20",
    dot: "bg-amber-400",
  },
  critical: {
    fg: "text-rose-400",
    bg: "bg-rose-400/10",
    ring: "ring-rose-400/20",
    dot: "bg-rose-400",
  },
  neutral: {
    fg: "text-zinc-300",
    bg: "bg-zinc-400/10",
    ring: "ring-zinc-400/15",
    dot: "bg-zinc-400",
  },
};

interface StatusBadgeProps {
  tone: Tone;
  label: string;
  withDot?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({
  tone,
  label,
  withDot = true,
  size = "sm",
}: StatusBadgeProps) {
  const t = TONE[tone];
  const sizeClass =
    size === "md" ? "text-[11px] px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wider ring-1 ${t.fg} ${t.bg} ${t.ring} ${sizeClass}`}
    >
      {withDot && (
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
      )}
      {label}
    </span>
  );
}
