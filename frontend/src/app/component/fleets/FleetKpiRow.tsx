import {
  LucideTruck,
  LucideCheckCircle,
  LucideMapPin,
  LucideRoute,
} from "lucide-react";
import type { ReactNode } from "react";
import type { FleetKpi } from "../../types/fleets";

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
      label: "Total Vehicles",
      value: kpi.totalVehicles,
      tone: "text-zinc-100",
      icon: <LucideTruck size={18} strokeWidth={1.5} />,
    },
    {
      label: "Active",
      value: kpi.activeVehicles,
      tone: "text-emerald-400",
      icon: <LucideCheckCircle size={18} strokeWidth={1.5} />,
    },
    {
      label: "Trips Today",
      value: kpi.todayTrips,
      tone: "text-zinc-100",
      icon: <LucideMapPin size={18} strokeWidth={1.5} />,
    },
    {
      label: "Distance",
      value: `${kpi.totalDistanceKm} km`,
      tone: "text-zinc-100",
      icon: <LucideRoute size={18} strokeWidth={1.5} />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, tone, icon }) => (
        <div
          key={label}
          className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface-1/50 p-4 transition-all duration-300 hover:border-zinc-700/50 hover:bg-surface-2/30"
        >
          <div className="absolute inset-0 bg-linear-to-br from-white/2 to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900/50 ring-1 ring-white/5">
              <span className="text-zinc-400 transition-colors duration-300 group-hover:text-zinc-300">
                {icon}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-mono-num text-2xl font-semibold tracking-tight ${tone}`}>
                {value}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                {label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default FleetKpiRow;
