import { motion } from "motion/react";
import TripRow from "./TripRow";
import type { BackendTrip } from "../../services/backendApi";
import { SPRING } from "../../utils/trips/tripMotion";

interface TripTableProps {
  trips: BackendTrip[];
}

export default function TripTable({ trips }: TripTableProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.15 }}
      className="panel overflow-hidden rounded-3xl"
    >
      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_0.8fr_1.2fr_1fr_1fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-white/[0.05] bg-white/[0.01] px-4 py-2.5 text-[10px] uppercase tracking-wider text-zinc-500">
        <span>Chuyến</span>
        <span>Trạng thái</span>
        <span>Tuyến đường</span>
        <span>Bắt đầu</span>
        <span>Kết thúc</span>
        <span>Điểm</span>
        <span>Cảnh báo</span>
        <span>Nghiêm trọng</span>
      </div>

      {/* Rows */}
      <div className="max-h-[520px] overflow-y-auto">
        {trips.length > 0 ? (
          <div className="divide-y divide-white/[0.03]">
            {trips.map((trip, i) => (
              <TripRow key={trip.trip_id} trip={trip} index={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3v4M8 3v4M2 11h20"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-400">Chưa có chuyến đi nào</p>
            <p className="mt-1 text-xs text-zinc-600">Nhấn "Chuyến mới" để bắt đầu</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}
