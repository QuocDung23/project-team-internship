import { CheckCircle } from "lucide-react";
import VehicleCard from "./VehicleCard";
import type { VehicleSnapshot } from "../../types/fleets";

interface VehicleGridProps {
  vehicles: VehicleSnapshot[];
  emptyMessage?: string;
}

function VehicleGrid({
  vehicles,
  emptyMessage = "No vehicles in queue",
}: VehicleGridProps) {
  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-hairline bg-surface-1/20 py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <CheckCircle size={28} strokeWidth={1.5} className="text-emerald-400" />
        </div>
        <p className="text-[13px] text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {vehicles.map((v) => (
        <VehicleCard key={v.id} vehicle={v} />
      ))}
    </div>
  );
}

export default VehicleGrid;
