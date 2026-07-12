import { ShieldCheck, Truck, Users, Warning } from "@phosphor-icons/react";
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
        label="Tổng xe đang chạy"
        value={driving}
        hint={`${idle} idle · ${disabled} disable · ${total} tài xế`}
        tone="active"
        icon={<Truck size={16} weight="duotone" />}
      />
      <KpiCard
        label="Tài xế idle"
        value={idle}
        hint={`${driving} driving · ${disabled} disable`}
        icon={<Users size={16} weight="duotone" />}
      />
      <KpiCard
        label="Cảnh báo ca"
        value={kpis.totalAlerts}
        hint={`${kpis.criticalAlerts} critical alerts`}
        tone={alertsTone}
        icon={<Warning size={16} weight="duotone" />}
      />
      <KpiCard
        label="Điểm an toàn TB"
        value={kpis.averageScore === null ? "—" : kpis.averageScore}
        hint="Average completed trip score"
        tone={kpis.averageScore !== null && kpis.averageScore < 60 ? "critical" : "active"}
        icon={<ShieldCheck size={16} weight="duotone" />}
      />
    </div>
  );
}
