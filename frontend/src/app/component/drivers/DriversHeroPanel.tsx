import {
  Plus,
  ArrowRight,
  Phone,
  Gauge,
  ShieldCheck,
  Activity,
} from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import DriverStatTile from "./DriverStatTile";
import { SPRING } from "../../utils/drivers/driverFormHelpers";

export default function DriversHeroPanel({
  total,
  driving,
  idle,
  onPhone,
  disable,
  onAdd,
}: {
  total: number;
  driving: number;
  idle: number;
  onPhone: number;
  disable: number;
  onAdd: () => void;
}) {
  const tiles: ReadonlyArray<{
    icon: ReactNode;
    label: string;
    value: number;
    tone: "emerald" | "zinc" | "rose" | "amber";
    delay: number;
  }> = [
    {
      icon: <Activity size={14} strokeWidth={2} />,
      label: "Driving",
      value: driving,
      tone: "emerald",
      delay: 0.1,
    },
    {
      icon: <Gauge size={14} strokeWidth={2} />,
      label: "Idle",
      value: idle,
      tone: "zinc",
      delay: 0.15,
    },
    {
      icon: <Phone size={14} strokeWidth={2} />,
      label: "On phone",
      value: onPhone,
      tone: "rose",
      delay: 0.2,
    },
    {
      icon: <ShieldCheck size={14} strokeWidth={2} />,
      label: "Disabled",
      value: disable,
      tone: "amber",
      delay: 0.25,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.05 }}
      className="relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02] p-[1.5px]"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 60px -24px rgba(0,0,0,0.55)",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[calc(1.75rem-1.5px)] border border-white/[0.05] bg-gradient-to-br from-zinc-950/95 via-zinc-950/85 to-zinc-900/70 px-6 py-6 md:px-8 md:py-7"
        style={{
          backgroundImage:
            "radial-gradient(60% 80% at 100% 0%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0) 60%), radial-gradient(40% 60% at 0% 100%, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0) 60%), linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 60%)",
        }}
      >
        {/* Hairline grid backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
          }}
        />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          {/* Eyebrow + Title + Description (asymmetric left col) */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono-num text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-300">
                Driver Roster
              </span>
            </div>

            <h1 className="text-[clamp(1.75rem,2.4vw,2.25rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-zinc-50">
              Đội ngũ{" "}
              <span className="bg-gradient-to-r from-emerald-200 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
                tài xế
              </span>{" "}
              trực ca
            </h1>

            <p className="mt-2.5 max-w-[58ch] text-[13px] leading-relaxed text-zinc-400">
              Theo dõi trạng thái, điểm an toàn và cảnh báo thời gian thực của{" "}
              <span className="font-mono-num font-semibold text-zinc-200">
                {total}
              </span>{" "}
              tài xế ·{" "}
              <span className="font-mono-num font-semibold text-emerald-300">
                {driving}
              </span>{" "}
              đang lái ·{" "}
              <span className="font-mono-num font-semibold text-zinc-300">
                {idle}
              </span>{" "}
              rảnh ·{" "}
              <span className="font-mono-num font-semibold text-rose-300">
                {disable}
              </span>{" "}
              tạm khoá.
            </p>
          </div>

          {/* Asymmetric stat strip (4 stat tiles, varying prominence) */}
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:min-w-[460px]">
            {tiles.map((tile) => (
              <DriverStatTile
                key={tile.label}
                icon={tile.icon}
                label={tile.label}
                value={tile.value}
                tone={tile.tone}
                delay={tile.delay}
              />
            ))}
          </div>

          {/* Primary CTA — pill with trailing icon circle (Button-in-Button architecture) */}
          <motion.button
            type="button"
            onClick={onAdd}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            className="group relative inline-flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-[1.5px] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-emerald-500/30 hover:bg-emerald-500/[0.06]"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold tracking-tight text-zinc-100"
              style={{
                background:
                  "linear-gradient(180deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px -8px rgba(16,185,129,0.40)",
              }}
            >
              <Plus size={14} strokeWidth={2.5} className="text-emerald-300" />
              <span className="text-zinc-50">Thêm tài xế</span>
              <span
                aria-hidden
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-emerald-300 ring-1 ring-white/[0.08] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
              >
                <ArrowRight size={11} strokeWidth={2.5} />
              </span>
            </span>
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}
