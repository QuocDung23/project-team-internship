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
        <h1 className="flex items-center gap-2 text-base font-semibold tracking-tight text-text-primary">
          <Users size={18} strokeWidth={2} className="text-accent-active" />
          Driver Management
        </h1>
        <p className="mt-0.5 text-[12px] text-text-tertiary">
          {stats.total} drivers · {stats.driving} driving · {stats.idle} idle · {stats.disable} disabled
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-md border border-accent-active/30 bg-accent-active/10 px-3 py-1.5 text-[11px] font-medium text-accent-active transition-colors hover:bg-accent-active/20"
      >
        <Plus size={13} strokeWidth={2.5} />
        Add driver
      </button>
    </header>
  );
}

export default DriversHeader;
