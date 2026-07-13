import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  SPRING,
  
} from "../../utils/trips/tripMotion";

interface TripHeroHeaderProps {
  activeTripCount: number;
  completedCount: number;
  avgScore: number | null;
  totalAlerts: number;
  criticalAlerts: number;
  canStartNew: boolean;
  onNewTrip: () => void;
}

interface SummaryTile {
  label: string;
  value: string;
  tone: "emerald" | "zinc" | "amber" | "rose";
  icon: ReactNode;
}

export default function TripHeroHeader({
  activeTripCount,
  completedCount,
  avgScore,
  totalAlerts,
  criticalAlerts,
  canStartNew,
  onNewTrip,
}: TripHeroHeaderProps) {
  const tiles: SummaryTile[] = [
    {
      label: "Hoàn thành",
      value: String(completedCount),
      tone: "emerald",
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    },
    {
      label: "Đang hoạt động",
      value: String(activeTripCount),
      tone: "zinc",
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      label: "Điểm TB",
      value: avgScore === null ? "-" : String(avgScore),
      tone: avgScore !== null && avgScore >= 80 ? "emerald" : avgScore !== null && avgScore >= 60 ? "amber" : "rose",
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    },
    {
      label: "Cảnh báo",
      value: `${totalAlerts}/${criticalAlerts}`,
      tone: criticalAlerts > 0 ? "rose" : "zinc",
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
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
            "radial-gradient(60% 80% at 100% 0%, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0) 60%), radial-gradient(40% 60% at 0% 100%, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0) 60%), linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 60%)",
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

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {/* Left: Title + description */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono-num text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-300">
                My Trips
              </span>
            </div>

            <h1 className="text-[clamp(1.75rem,2.4vw,2.25rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-zinc-50">
              Chuyến đi của{" "}
              <span className="bg-gradient-to-r from-emerald-200 via-emerald-300 to-teal-200 bg-clip-text text-transparent">
                tài xế
              </span>
            </h1>

            <p className="mt-2.5 max-w-[58ch] text-[13px] leading-relaxed text-zinc-400">
              {activeTripCount > 0 ? (
                <>
                  <span className="font-mono-num font-semibold text-emerald-300">
                    {activeTripCount}
                  </span>{" "}
                  chuyến đang hoạt động
                </>
              ) : (
                <>
                  <span className="font-mono-num font-semibold text-zinc-200">
                    {completedCount}
                  </span>{" "}
                  chuyến đã ghi nhận
                </>
              )}
            </p>
          </div>

          {/* Stat tiles — 2x2 on mobile, 4 in a row on lg */}
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:min-w-[420px]">
            {tiles.map((tile, i) => (
              <motion.div
                key={tile.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.08 + i * 0.06 }}
                whileHover={{ y: -2 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[1.5px]"
              >
                <div className="relative overflow-hidden rounded-[calc(1rem-1.5px)] bg-gradient-to-br from-zinc-950/80 to-zinc-900/40 px-3.5 py-3">
                  {/* Glow blob */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background: glowColor(tile.tone),
                    }}
                  />
                  <div className="relative flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03] ${toneText(tile.tone)}`}>
                      {tile.icon}
                    </span>
                    {tile.label}
                  </div>
                  <div className={`relative mt-2 font-mono-num text-2xl font-semibold tracking-tight tabular-nums ${toneText(tile.tone)}`}>
                    {tile.value}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA pill */}
          <motion.button
            type="button"
            onClick={onNewTrip}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            disabled={!canStartNew}
            className="group relative inline-flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-[1.5px] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-emerald-500/30 hover:bg-emerald-500/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold tracking-tight text-zinc-100"
              style={{
                background: "linear-gradient(180deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px -8px rgba(16,185,129,0.40)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="text-zinc-50">Chuyến mới</span>
              <span
                aria-hidden
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-emerald-300 ring-1 ring-white/[0.08] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </span>
            </span>
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}

function toneText(tone: SummaryTile["tone"]): string {
  switch (tone) {
    case "emerald": return "text-emerald-300";
    case "zinc": return "text-zinc-300";
    case "amber": return "text-amber-300";
    case "rose": return "text-rose-300";
  }
}

function glowColor(tone: SummaryTile["tone"]): string {
  switch (tone) {
    case "emerald": return "radial-gradient(circle, rgba(16,185,129,0.55) 0%, transparent 70%)";
    case "zinc": return "radial-gradient(circle, rgba(161,161,170,0.40) 0%, transparent 70%)";
    case "amber": return "radial-gradient(circle, rgba(245,158,11,0.55) 0%, transparent 70%)";
    case "rose": return "radial-gradient(circle, rgba(244,63,94,0.55) 0%, transparent 70%)";
  }
}
