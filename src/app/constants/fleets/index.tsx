import {
  SpinnerGap,
  StopCircle,
  Timer,
  Truck,
  Wrench,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { VehicleSnapshot } from "../../data/mockMetrics";
import type { KpiTone } from "../../types/dashboards";

interface VehicleStatusConfig {
  label: string;
  tone: KpiTone;
  icon: ReactNode;
}

const STATUS_CONFIG: Record<VehicleSnapshot["status"], VehicleStatusConfig> = {
  waiting: { label: "Đang đợi", tone: "warn", icon: <Timer size={12} /> },
  loading: {
    label: "Đang xếp hàng",
    tone: "active",
    icon: <SpinnerGap size={12} className="animate-spin" />,
  },
  in_transit: { label: "Đang chạy", tone: "active", icon: <Truck size={12} /> },
  idle: { label: "Idle", tone: "neutral", icon: <StopCircle size={12} /> },
  maintenance: {
    label: "Bảo dưỡng",
    tone: "critical",
    icon: <Wrench size={12} />,
  },
};

const FleetConstants = {
  STATUS_CONFIG,
} as const;

export default FleetConstants;
