import {
  ShieldCheck,
  Truck,
  Users,
  AlertTriangle,
} from "lucide-react";
import { motion } from "motion/react";
import KpiCard from "./KpiCard";
import type { KpiTone } from "../../types/dashboards";

export interface DashboardKpis {
  total: number;
  driving: number;
  idle: number;
  disable: number;
  averageScore: number | null;
  criticalAlerts: number;
  totalAlerts: number;
}

interface KpiGridProps {
  kpis: DashboardKpis;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
};

export default function KpiGrid({ kpis }: KpiGridProps) {
  const total = kpis.total;
  const driving = kpis.driving;
  const idle = kpis.idle;
  const disabled = kpis.disable;
  const alertsTone: KpiTone =
    kpis.criticalAlerts > 0
      ? "critical"
      : kpis.totalAlerts > 0
        ? "warn"
        : "active";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      <motion.div variants={itemVariants}>
        <KpiCard
          label="Driving"
          value={driving}
          hint={`${idle} idle · ${disabled} disabled · ${total} total`}
          tone="active"
          icon={<Truck size={16} strokeWidth={1.5} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KpiCard
          label="Idle"
          value={idle}
          hint={`${driving} driving · ${disabled} disabled`}
          icon={<Users size={16} strokeWidth={1.5} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KpiCard
          label="Alerts"
          value={kpis.totalAlerts}
          hint={`${kpis.criticalAlerts} critical`}
          tone={alertsTone}
          icon={<AlertTriangle size={16} strokeWidth={1.5} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KpiCard
          label="Avg Score"
          value={kpis.averageScore === null ? "—" : kpis.averageScore}
          hint="Average completed trip score"
          tone={
            kpis.averageScore !== null && kpis.averageScore < 60
              ? "critical"
              : "active"
          }
          icon={<ShieldCheck size={16} strokeWidth={1.5} />}
        />
      </motion.div>
    </motion.div>
  );
}
