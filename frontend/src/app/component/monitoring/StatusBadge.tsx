import type { MetricStatus } from "../../types/monitoring";

type Tone = MetricStatus | "neutral";

const TONE: Record<
  Tone,
  { fg: string; bg: string; ring: string; dot: string }
> = {
  active: {
    fg: "text-accent-active",
    bg: "bg-accent-active/10",
    ring: "ring-accent-active/20",
    dot: "bg-accent-active",
  },
  warn: {
    fg: "text-accent-warn",
    bg: "bg-accent-warn/10",
    ring: "ring-accent-warn/20",
    dot: "bg-accent-warn",
  },
  critical: {
    fg: "text-accent-critical",
    bg: "bg-accent-critical/10",
    ring: "ring-accent-critical/20",
    dot: "bg-accent-critical",
  },
  neutral: {
    fg: "text-text-secondary",
    bg: "bg-subtle-bg",
    ring: "ring-hairline",
    dot: "bg-text-tertiary",
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
