import { ArrowUpRight } from "@phosphor-icons/react";
import type { Driver } from "../../types";
import { formatTime } from "../../hook/useTicker";
import { StatusBadge } from "../monitoring/StatusBadge";
import DashboardConstants from "../../constants/dashboards";

const { STATUS_LABEL, STATUS_TONE } = DashboardConstants;

interface DriverTableProps {
  drivers: Driver[];
  maxRows?: number;
}

export default function DriverTable({ drivers, maxRows = 8 }: DriverTableProps) {
  const rows = drivers.slice(0, maxRows);
  return (
    <section className="panel flex flex-col gap-3 px-5 py-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-zinc-100">
            Trạng thái tài xế theo thời gian thực
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Bảng này cập nhật mỗi 2.2s từ socket mock. Click vào từng dòng để
            vào giám sát chi tiết.
          </p>
        </div>
        <a
          href="/monitoring"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 hover:text-emerald-200"
        >
          Xem giám sát chi tiết
          <ArrowUpRight size={12} weight="bold" />
        </a>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-hairline">
              <th className="py-2 pr-3 font-medium">Mã</th>
              <th className="py-2 pr-3 font-medium">Tài xế</th>
              <th className="py-2 pr-3 font-medium">Biển số</th>
              <th className="py-2 pr-3 font-medium">Khu vực</th>
              <th className="py-2 pr-3 font-medium">EAR</th>
              <th className="py-2 pr-3 font-medium">Trạng thái</th>
              <th className="py-2 pr-3 font-medium">Cảnh báo ca</th>
              <th className="py-2 pl-3 font-medium">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-[12px] text-zinc-500"
                >
                  Đang tải dữ liệu từ socket...
                </td>
              </tr>
            )}
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-surface-2/40">
                <td className="py-2.5 pr-3 font-mono-num text-zinc-300">
                  {d.id}
                </td>
                <td className="py-2.5 pr-3 font-medium text-zinc-100">
                  {d.name}
                </td>
                <td className="py-2.5 pr-3 font-mono-num text-zinc-400">
                  {d.licensePlate}
                </td>
                <td className="py-2.5 pr-3 text-zinc-400">{d.team}</td>
                <td className="py-2.5 pr-3 font-mono-num text-zinc-200">
                  {d.ear.toFixed(2)}
                </td>
                <td className="py-2.5 pr-3">
                  <StatusBadge
                    tone={STATUS_TONE[d.status]}
                    label={STATUS_LABEL[d.status]}
                  />
                </td>
                <td className="py-2.5 pr-3 font-mono-num text-amber-300">
                  {d.totalAlerts}
                </td>
                <td className="py-2.5 pl-3 font-mono-num text-zinc-500">
                  {formatTime(d.lastUpdate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}