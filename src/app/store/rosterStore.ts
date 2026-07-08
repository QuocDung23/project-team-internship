import { create } from "zustand";
import type { Driver, DriverStatus, EyeState } from "../types";
import { useFleetStore } from "./fleetStore";

interface RosterState {
  add: (
    draft: Omit<
      Driver,
      "id" | "lastUpdate" | "totalAlerts" | "ear" | "eyeState" | "status"
    >,
  ) => void;
  update: (id: string, patch: Partial<Driver>) => void;
  remove: (id: string) => void;
}

function nextId(existing: Driver[]): string {
  const numbers = existing
    .map((d) => Number.parseInt(d.id.replace("D-", ""), 10))
    .filter((n) => Number.isFinite(n));
  const max = numbers.length ? Math.max(...numbers) : 1040;
  return `D-${max + 1}`;
}

export const useRosterStore = create<RosterState>(() => ({
  add: (draft) => {
    const drivers = Object.values(useFleetStore.getState().drivers);
    const id = nextId(drivers);
    const now = Date.now();
    const created: Driver = {
      ...draft,
      id,
      status: "active" satisfies DriverStatus,
      ear: 0.28,
      eyeState: "open" satisfies EyeState,
      lastUpdate: now,
      totalAlerts: 0,
    };
    useFleetStore.getState().applyTelemetry(created);
  },
  update: (id, patch) => {
    const current = useFleetStore.getState().drivers[id];
    if (!current) return;
    useFleetStore
      .getState()
      .applyTelemetry({ ...current, ...patch, lastUpdate: Date.now() });
  },
  remove: (id) => {
    const { [id]: _removed, ...rest } = useFleetStore.getState().drivers;
    void _removed;
    useFleetStore.setState({ drivers: rest });
  },
}));
