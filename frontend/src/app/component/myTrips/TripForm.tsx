import { motion } from "motion/react";
import type { StartMyTripPayload } from "../../services/backendApi";
import { SPRING } from "../../utils/trips/tripMotion";

interface TripFormProps {
  form: StartMyTripPayload;
  isBusy: boolean;
  onUpdateForm: (field: keyof StartMyTripPayload, value: string) => void;
  onCancel: () => void;
  onStartTrip: () => void;
}

export default function TripForm({
  form,
  isBusy,
  onUpdateForm,
  onCancel,
  onStartTrip,
}: TripFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.05 }}
      className="grid gap-4"
    >
      <div className="grid gap-3">
        {/* Trip code */}
        <div className="grid gap-1 text-[11px] text-zinc-400">
          <label htmlFor="trip-code" className="pl-1 uppercase tracking-[0.12em]">Mã chuyến</label>
          <input
            id="trip-code"
            type="text"
            value={form.code ?? ""}
            onChange={(e) => onUpdateForm("code", e.target.value)}
            placeholder="Tùy chọn - ví dụ: HCM-SGN-001"
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[12px] text-zinc-100 outline-none transition-all duration-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:bg-white/[0.05]"
          />
        </div>

        {/* Origin + Destination */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1 text-[11px] text-zinc-400">
            <label htmlFor="trip-origin" className="pl-1 uppercase tracking-[0.12em]">Điểm đi</label>
            <input
              id="trip-origin"
              type="text"
              value={form.origin ?? ""}
              onChange={(e) => onUpdateForm("origin", e.target.value)}
              placeholder="Tùy chọn"
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[12px] text-zinc-100 outline-none transition-all duration-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:bg-white/[0.05]"
            />
          </div>
          <div className="grid gap-1 text-[11px] text-zinc-400">
            <label htmlFor="trip-dest" className="pl-1 uppercase tracking-[0.12em]">Điểm đến</label>
            <input
              id="trip-dest"
              type="text"
              value={form.destination ?? ""}
              onChange={(e) => onUpdateForm("destination", e.target.value)}
              placeholder="Tùy chọn"
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[12px] text-zinc-100 outline-none transition-all duration-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:bg-white/[0.05]"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[12px] font-semibold text-zinc-300 transition-all duration-200 hover:bg-white/[0.06] disabled:opacity-40"
          disabled={isBusy}
          onClick={onCancel}
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={onStartTrip}
          disabled={isBusy}
          className="group relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold text-zinc-50 transition-all duration-500 disabled:opacity-40"
          style={{
            background: "linear-gradient(180deg, rgba(16,185,129,0.28) 0%, rgba(16,185,129,0.08) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px -8px rgba(16,185,129,0.45)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Bắt đầu chuyến
        </button>
      </div>
    </motion.div>
  );
}
