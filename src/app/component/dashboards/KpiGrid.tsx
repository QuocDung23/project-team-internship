import { ShieldCheck, Truck, Users, Warning } from "@phosphor-icons/react";
import KpiCard from "./KpiCard";
import type { KpiTone } from "../../types/dashboards";

export interface DashboardKpis {
  total: number;
  active: number;
  offline: number;
  warn: number;
  critical: number;
  totalAlerts: number;
}

interface KpiGridProps {
  kpis: DashboardKpis;
}

export default function KpiGrid({ kpis }: KpiGridProps) {
  const total = kpis.total;
  const active = kpis.active;
  const offline = kpis.offline;
  const warn = kpis.warn;
  const critical = kpis.critical;
  const alertsTone: KpiTone =
    critical > 0 ? "critical" : warn > 0 ? "warn" : "active";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Tổng xe đang chạy"
        value={total}
        hint={`${active} bình thường · ${offline} offline`}
        tone="active"
        icon={<Truck size={16} weight="duotone" />}
      />
      <KpiCard
        label="Tài xế online"
        value={total - offline}
        hint={`${total} tài xế trong hệ thống`}
        icon={<Users size={16} weight="duotone" />}
      />
      <KpiCard
        label="Cảnh báo ca"
        value={kpis.totalAlerts}
        hint={`${warn} cảnh báo · ${critical} nguy hiểm`}
        tone={alertsTone}
        icon={<Warning size={16} weight="duotone" />}
      />
      <KpiCard
        label="Tỉ lệ an toàn"
        value={total === 0 ? "—" : `${Math.round((active / total) * 100)}%`}
        hint="DWS score trung bình ca"
        tone={critical > 0 ? "warn" : "active"}
        icon={<ShieldCheck size={16} weight="duotone" />}
      />
    </div>
  );
}
