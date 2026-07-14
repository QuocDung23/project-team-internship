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
    <section className="rounded-xl border border-white/5 bg-white/2 px-5 py-4">
      <header className="mb-3">
        <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
          Realtime Driver Status
        </h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-white/5">
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
            className="divide-y divide-white/3"
          >
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-[12px] text-zinc-500"
                >
                  No backend driver data available.
                </td>
              </tr>
            )}
            {rows.map((d) => (
              <motion.tr
                key={d.id}
                variants={rowVariants}
                className="group cursor-pointer transition-colors duration-200 hover:bg-white/2"
              >
                <td className="py-2.5 pr-4 font-mono-num text-zinc-400">
                  {d.id}
                </td>
                <td className="py-2.5 pr-4 font-medium text-zinc-100">
                  {d.name}
                </td>
                <td className="py-2.5 pr-4 font-mono-num text-zinc-400">
                  {d.licensePlate}
                </td>
                <td className="py-2.5 pr-4 text-zinc-500">{d.team}</td>
                <td className="py-2.5 pr-4 font-mono-num text-zinc-300">
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
                        ? "text-red-300"
                        : d.totalAlerts > 0
                          ? "text-amber-300"
                          : "text-zinc-400"
                    }`}
                  >
                    {d.totalAlerts}
                  </span>
                </td>
                <td className="py-2.5 pl-4 font-mono-num text-zinc-500">
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
