import {
  SpinnerGap,
  StopCircle,
  Timer,
  Truck,
  Wrench,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { VehicleSnapshot } from "../../types/fleets";
import type { KpiTone } from "../../types/dashboards";

interface VehicleStatusConfig {
  labelKey:
    | "trips:vehicle.status.waiting"
    | "trips:vehicle.status.loading"
    | "trips:vehicle.status.in_transit"
    | "trips:vehicle.status.idle"
    | "trips:vehicle.status.maintenance";
  tone: KpiTone;
  icon: ReactNode;
}

export const STATUS_CONFIG: Record<VehicleSnapshot["status"], VehicleStatusConfig> = {
  waiting: { labelKey: "trips:vehicle.status.waiting", tone: "warn", icon: <Timer size={12} /> },
  loading: {
    labelKey: "trips:vehicle.status.loading",
    tone: "active",
    icon: <SpinnerGap size={12} className="animate-spin" />,
  },
  in_transit: { labelKey: "trips:vehicle.status.in_transit", tone: "active", icon: <Truck size={12} /> },
  idle: { labelKey: "trips:vehicle.status.idle", tone: "neutral", icon: <StopCircle size={12} /> },
  maintenance: {
    labelKey: "trips:vehicle.status.maintenance",
    tone: "critical",
    icon: <Wrench size={12} />,
  },
};

const FleetConstants = {
  STATUS_CONFIG,
} as const;

export default FleetConstants;
