export type KpiTone = "active" | "warn" | "critical" | "neutral";

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiTone;
  icon: import("react").ReactNode;
}
