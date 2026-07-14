import type { Driver } from "../../types";
import { formatTime } from "../../hook/useTicker";
import { StatusBadge } from "../monitoring/StatusBadge";
import DashboardConstants from "../../constants/dashboards";
import { motion } from "motion/react";

const { STATUS_LABEL, STATUS_TONE } = DashboardConstants;

interface DriverTableProps {
  drivers: Driver[];
  maxRows?: number;
}

const tableVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
};

export default function DriverTable({
  drivers,
  maxRows = 8,
}: DriverTableProps) {
  const rows = drivers.slice(0, maxRows);
  return (
    <section className="rounded-xl border border-hairline bg-subtle-bg px-5 py-4">
      <header className="mb-3">
        <h2 className="text-[13px] font-semibold tracking-tight text-text-primary">
          Realtime Driver Status
        </h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="text-[10px] uppercase tracking-wider text-text-tertiary">
            <tr className="border-b border-hairline">
              <th className="py-2 pr-4 font-medium">ID</th>
              <th className="py-2 pr-4 font-medium">Driver</th>
              <th className="py-2 pr-4 font-medium">Plate</th>
              <th className="py-2 pr-4 font-medium">Team</th>
              <th className="py-2 pr-4 font-medium">EAR</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">Alerts</th>
              <th className="py-2 pl-4 font-medium">Updated</th>
            </tr>
          </thead>
          <motion.tbody
            variants={tableVariants}
            initial="hidden"
            animate="visible"
            className="divide-y divide-hairline"
          >
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-[12px] text-text-tertiary"
                >
                  No backend driver data available.
                </td>
              </tr>
            )}
            {rows.map((d) => (
              <motion.tr
                key={d.id}
                variants={rowVariants}
                className="group cursor-pointer transition-colors duration-200 hover:bg-subtle-bg-hover"
              >
                <td className="py-2.5 pr-4 font-mono-num text-text-secondary">
                  {d.id}
                </td>
                <td className="py-2.5 pr-4 font-medium text-text-primary">
                  {d.name}
                </td>
                <td className="py-2.5 pr-4 font-mono-num text-text-secondary">
                  {d.licensePlate}
                </td>
                <td className="py-2.5 pr-4 text-text-tertiary">{d.team}</td>
                <td className="py-2.5 pr-4 font-mono-num text-text-secondary">
                  {d.ear.toFixed(2)}
                </td>
                <td className="py-2.5 pr-4">
                  <StatusBadge
                    tone={STATUS_TONE[d.status]}
                    label={STATUS_LABEL[d.status]}
                  />
                </td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`font-mono-num ${
                      d.totalAlerts > 5
                        ? "text-accent-critical"
                        : d.totalAlerts > 0
                          ? "text-accent-warn"
                          : "text-text-secondary"
                    }`}
                  >
                    {d.totalAlerts}
                  </span>
                </td>
                <td className="py-2.5 pl-4 font-mono-num text-text-tertiary">
                  {formatTime(d.lastUpdate)}
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </section>
  );
}
