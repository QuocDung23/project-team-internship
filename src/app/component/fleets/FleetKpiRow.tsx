import { CheckCircle, Gauge, MapPin, Truck } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { FleetKpi } from "../../data/mockMetrics";

interface FleetKpiRowProps {
  kpi: FleetKpi;
}

interface KpiItem {
  label: string;
  value: ReactNode;
  tone: string;
  icon: ReactNode;
}

function FleetKpiRow({ kpi }: FleetKpiRowProps) {
  const items: ReadonlyArray<KpiItem> = [
    {
      label: "Tổng xe",
      value: kpi.totalVehicles,
      tone: "text-zinc-100",
      icon: <Truck size={14} />,
    },
    {
      label: "Đang chạy",
      value: kpi.activeVehicles,
      tone: "text-emerald-400",
      icon: <CheckCircle size={14} />,
    },
    {
      label: "Chuyến hôm nay",
      value: kpi.todayTrips,
      tone: "text-zinc-100",
      icon: <MapPin size={14} />,
    },
    {
      label: "Quãng đường",
      value: `${kpi.totalDistanceKm} km`,
      tone: "text-zinc-100",
      icon: <Gauge size={14} />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, tone, icon }) => (
        <div key={label} className="panel flex items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-zinc-400">
            {icon}
          </span>
          <div>
            <p className={`font-mono-num text-lg font-semibold ${tone}`}>
              {value}
            </p>
            <p className="text-[10px] text-zinc-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default FleetKpiRow;
