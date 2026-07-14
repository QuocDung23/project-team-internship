import {
  ShieldCheck,
  Truck,
  Users,
  AlertTriangle,
} from "lucide-react";
import KpiCard from "./KpiCard";
import type { KpiTone } from "../../types/dashboards";

export interface DashboardKpis {
  total: number;
  driving: number;
  idle: number;
  disable: number;
  averageScore: number | null;
  criticalAlerts: number;
  totalAlerts: number;
}

interface KpiGridProps {
  kpis: DashboardKpis;
}

export default function KpiGrid({ kpis }: KpiGridProps) {
  const total = kpis.total;
  const driving = kpis.driving;
  const idle = kpis.idle;
  const disabled = kpis.disable;
  const alertsTone: KpiTone =
    kpis.criticalAlerts > 0 ? "critical" : kpis.totalAlerts > 0 ? "warn" : "active";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Total Driving"
        value={driving}
        hint={`${idle} idle · ${disabled} disabled · ${total} drivers`}
        tone="active"
        icon={<Truck size={18} strokeWidth={1.5} />}
      />
      <KpiCard
        label="Idle Drivers"
        value={idle}
        hint={`${driving} driving · ${disabled} disabled`}
        icon={<Users size={18} strokeWidth={1.5} />}
      />
      <KpiCard
        label="Alerts"
        value={kpis.totalAlerts}
        hint={`${kpis.criticalAlerts} critical alerts`}
        tone={alertsTone}
        icon={<AlertTriangle size={18} strokeWidth={1.5} />}
      />
      <KpiCard
        label="Avg. Safety Score"
        value={kpis.averageScore === null ? "—" : kpis.averageScore}
        hint="Average completed trip score"
        tone={kpis.averageScore !== null && kpis.averageScore < 60 ? "critical" : "active"}
        icon={<ShieldCheck size={18} strokeWidth={1.5} />}
      />
    </div>
  );
}