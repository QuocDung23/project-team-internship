import { Plus, Users } from "lucide-react";
import type { DriverStats } from "../../types/drivers";

interface DriversHeaderProps {
  stats: Pick<DriverStats, "total" | "driving" | "idle" | "disable">;
  onAdd: () => void;
}

function DriversHeader({ stats, onAdd }: DriversHeaderProps) {
  return (
    <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-100">
          <Users size={18} strokeWidth={2} className="text-violet-400" />
          Quản lý tài xế
        </h1>
        <p className="mt-0.5 text-[12px] text-zinc-400">
          {stats.total} tài xế · {stats.driving} driving · {stats.idle} idle · {stats.disable} disable
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-3 py-1.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25 transition-colors"
      >
        <Plus size={13} strokeWidth={2.5} />
        Thêm tài xế
      </button>
    </header>
  );
}

export default DriversHeader;
