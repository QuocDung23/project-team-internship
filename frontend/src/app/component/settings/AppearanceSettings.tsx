import { Moon, Sun, type LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useThemeColor, type ThemeMode } from "../../themeColor";

const THEME_OPTIONS: ReadonlyArray<{
  mode: ThemeMode;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    mode: "dark",
    label: "Dark",
    description: "Current console palette",
    icon: Moon,
  },
  {
    mode: "light",
    label: "Light",
    description: "Bright operations view",
    icon: Sun,
  },
];

export default function AppearanceSettings() {
  const reduceMotion = useReducedMotion();
  const { themeMode, setThemeMode } = useThemeColor();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="theme-card rounded-2xl p-6"
    >
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-text-primary">
          Appearance
        </h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Choose how the console is displayed on this device
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-hairline bg-surface-2 p-1.5">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = option.mode === themeMode;

          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => setThemeMode(option.mode)}
              className={[
                "group flex min-h-24 flex-col items-start justify-between rounded-xl px-3 py-3 text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                selected
                  ? "bg-surface text-text-primary shadow-[0_14px_36px_-28px_var(--theme-shadow)] ring-1 ring-hairline"
                  : "text-text-secondary hover:bg-(--theme-subtle-bg-hover) hover:text-text-primary",
              ].join(" ")}
              aria-pressed={selected}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  selected
                    ? "bg-accent-active/12 text-accent-active ring-1 ring-accent-active/25"
                    : "theme-icon-shell text-text-tertiary group-hover:text-text-primary",
                ].join(" ")}
              >
                <Icon size={15} strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-[12px] font-semibold">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-text-tertiary">
                  {option.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
