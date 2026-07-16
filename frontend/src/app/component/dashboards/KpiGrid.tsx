import {
  ShieldCheck,
  Truck,
  Users,
  AlertTriangle,
} from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("dashboard");

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
          label={t("kpiGrid.labels.driving")}
          value={driving}
          hint={t("kpiGrid.hints.drivingBreakdown", {
            idle,
            disabled,
            total,
          })}
          tone="active"
          icon={<Truck size={16} strokeWidth={1.5} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KpiCard
          label={t("kpiGrid.labels.idle")}
          value={idle}
          hint={t("kpiGrid.hints.idleBreakdown", {
            driving,
            disabled,
          })}
          icon={<Users size={16} strokeWidth={1.5} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KpiCard
          label={t("kpiGrid.labels.alerts")}
          value={kpis.totalAlerts}
          hint={t("kpiGrid.hints.criticalCount", {
            count: kpis.criticalAlerts,
          })}
          tone={alertsTone}
          icon={<AlertTriangle size={16} strokeWidth={1.5} />}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <KpiCard
          label={t("kpiGrid.labels.avgScore")}
          value={kpis.averageScore === null ? "—" : kpis.averageScore}
          hint={t("kpiGrid.hints.avgScoreDescription")}
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