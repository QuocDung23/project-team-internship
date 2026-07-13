import { Plus, Loader } from "lucide-react";
import { motion } from "motion/react";
import { SPRING } from "../../utils/drivers/driverFormHelpers";

export default function DriverDialogFooter({
  mode,
  isSaving,
  onCancel,
}: {
  mode: "create" | "manage";
  isSaving: boolean;
  onCancel: () => void;
}) {
  return (
    <>
      <motion.button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        className="group inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] p-[1.5px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/[0.16] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="rounded-full px-4 py-2 text-[11.5px] font-medium text-zinc-400 transition-colors group-hover:text-zinc-200">
          Huỷ
        </span>
      </motion.button>
      <motion.button
        type="submit"
        form="driver-form"
        disabled={isSaving}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRING}
        className="group inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] p-[1.5px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-emerald-400/40 hover:bg-emerald-500/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11.5px] font-semibold text-emerald-100"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), 0 6px 20px -8px rgba(16,185,129,0.45)",
          }}
        >
          {isSaving ? (
            <Loader
              size={13}
              strokeWidth={2.5}
              className="animate-spin text-emerald-300"
            />
          ) : (
            <Plus size={13} strokeWidth={2.5} className="text-emerald-300" />
          )}
          {mode === "manage" ? "Lưu thay đổi" : "Tạo tài xế"}
        </span>
      </motion.button>
    </>
  );
}
