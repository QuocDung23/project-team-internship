import { Plus, ArrowRight, Gauge, ShieldCheck, Activity } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import DriverStatTile from "./DriverStatTile";
import { SPRING } from "../../utils/drivers/driverFormHelpers";

type HeroStatTileKey = "headerStats.driving" | "headerStats.idle" | "headerStats.disabled";

interface HeroTileDescriptor {
  icon: ReactNode;
  labelKey: HeroStatTileKey;
  value: number;
  tone: "emerald" | "zinc" | "rose" | "amber";
  delay: number;
}

export default function DriversHeroPanel({
  total,
  driving,
  idle,
  disable,
  onAdd,
}: {
  total: number;
  driving: number;
  idle: number;
  disable: number;
  onAdd: () => void;
}) {
  const { t } = useTranslation("drivers");

  const tiles: ReadonlyArray<HeroTileDescriptor> = [
    {
      icon: <Activity size={14} strokeWidth={2} />,
      labelKey: "headerStats.driving",
      value: driving,
      tone: "emerald",
      delay: 0.1,
    },
    {
      icon: <Gauge size={14} strokeWidth={2} />,
      labelKey: "headerStats.idle",
      value: idle,
      tone: "zinc",
      delay: 0.15,
    },
    {
      icon: <ShieldCheck size={14} strokeWidth={2} />,
      labelKey: "headerStats.disabled",
      value: disable,
      tone: "rose",
      delay: 0.2,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.05 }}
      className="relative overflow-hidden rounded-[28px] border border-hairline bg-subtle-bg p-[1.5px]"
      style={{
        boxShadow:
          "inset 0 1px 0 var(--theme-subtle-border), 0 24px 60px -24px var(--theme-shadow)",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[calc(1.75rem-1.5px)] border border-hairline bg-elevated px-6 py-6 md:px-8 md:py-7"
        style={{
          backgroundImage:
            "radial-gradient(60% 80% at 100% 0%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0) 60%), radial-gradient(40% 60% at 0% 100%, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0) 60%), linear-gradient(135deg, var(--theme-subtle-bg) 0%, transparent 60%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(var(--theme-subtle-border) 1px, transparent 1px), linear-gradient(90deg, var(--theme-subtle-border) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
          }}
        />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-subtle-bg px-2.5 py-1 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent-active/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-active" />
              </span>
              <span className="font-mono-num text-[10px] font-medium uppercase tracking-[0.18em] text-text-secondary">
                {t("hero.eyebrow")}
              </span>
            </div>

            <h1 className="text-[clamp(1.75rem,2.4vw,2.25rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-text-primary">
              {t("hero.titleStart")}{" "}
              <span className="bg-linear-to-r from-accent-active via-accent-active to-teal-400 bg-clip-text text-transparent">
                {t("hero.titleAccent")}
              </span>{" "}
              {t("hero.titleEnd")}
            </h1>

            <p className="mt-2.5 max-w-[58ch] text-[13px] leading-relaxed text-text-secondary">
              {t("hero.summary", {
                total,
                driving,
                idle,
                disabled: disable,
              })}
            </p>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[360px]">
            {tiles.map((tile) => (
              <DriverStatTile
                key={tile.labelKey}
                icon={tile.icon}
                label={t(tile.labelKey)}
                value={tile.value}
                tone={tile.tone}
                delay={tile.delay}
              />
            ))}
          </div>

          <motion.button
            type="button"
            onClick={onAdd}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            aria-label={t("hero.addDriver")}
            className="group relative inline-flex shrink-0 items-center gap-1 rounded-full border border-accent-active/30 bg-subtle-bg p-[1.5px] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-accent-active/50 hover:bg-accent-active/6"
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-semibold tracking-tight text-text-primary"
              style={{
                background:
                  "linear-gradient(180deg, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px -8px var(--theme-shadow)",
              }}
            >
              <Plus size={14} strokeWidth={2.5} className="text-accent-active" />
              <span>{t("hero.addDriver")}</span>
              <span
                aria-hidden
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-accent-active ring-1 ring-white/8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
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
