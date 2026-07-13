import { CheckCircle } from "lucide-react";
import VehicleCard from "./VehicleCard";
import type { VehicleSnapshot } from "../../types/fleets";

interface VehicleGridProps {
  vehicles: VehicleSnapshot[];
  emptyMessage?: string;
}

function VehicleGrid({
  vehicles,
  emptyMessage = "Không có xe nào đang đợi hoặc xếp hàng",
}: VehicleGridProps) {
  if (vehicles.length === 0) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-3 py-16">
        <CheckCircle size={32} className="text-emerald-400" />
        <p className="text-[13px] text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {vehicles.map((v) => (
        <VehicleCard key={v.id} vehicle={v} />
      ))}
    </div>
  );
}

export default VehicleGrid;
