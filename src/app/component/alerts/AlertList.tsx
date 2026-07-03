import { AlertTriangle } from "lucide-react";
import type { MockFleetEvent } from "../../data/mockMetrics";
import AlertRow from "./AlertRow";


interface AlertListProps {
  events: MockFleetEvent[];
}

export default function AlertList({ events }: AlertListProps) {
  if (events.length === 0) {
    return (
      <div className="panel flex flex-col items-center justify-center gap-3 py-16">
        <AlertTriangle size={32} className="text-zinc-600" />
        <p className="text-[13px] text-zinc-500">
          Không có cảnh báo nào phù hợp
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
      {events.map((event) => (
        <AlertRow key={event.id} event={event} />
      ))}
    </div>
  );
}
