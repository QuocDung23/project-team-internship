import { Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useThemeColor, type ThemeMode } from "../../themeColor";

const THEME_OPTIONS: ReadonlyArray<{
  mode: ThemeMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  {
    mode: "light",
    label: "Light",
    description: "Bright and clear display",
    icon: Sun,
  },
  {
    mode: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    icon: Moon,
  },
];

export default function UserAppearanceSettings() {
  const reduceMotion = useReducedMotion();
  const { themeMode, setThemeMode } = useThemeColor();

  const handleSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const isSelected = (mode: ThemeMode) => themeMode === mode;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="bezel-shell overflow-hidden"
    >
      <div className="bezel-core relative">
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-subtle-bg">
            <Sun size={18} strokeWidth={1.7} className="text-accent-active" />
          </div>
          <div>
            <h2 className="section-headline text-base">Appearance</h2>
            <p className="section-subline">Choose your preferred display mode</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = isSelected(option.mode);

            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => handleSelect(option.mode)}
                className={[
                  "group flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]",
                  selected
                    ? "border-accent-active/40 bg-accent-active/8 shadow-[0_8px_24px_-12px_var(--theme-shadow)]"
                    : "border-hairline bg-subtle-bg hover:border-hairline hover:bg-subtle-bg-hover",
                ].join(" ")}
                aria-pressed={selected}
              >
                <span
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    selected
                      ? "border-accent-active/30 bg-accent-active/15 text-accent-active shadow-[0_4px_12px_-4px_var(--theme-shadow)]"
                      : "border-hairline bg-subtle-bg text-text-secondary group-hover:border-hairline group-hover:bg-subtle-bg-hover",
                  ].join(" ")}
                >
                  <Icon size={22} strokeWidth={1.7} />
                </span>
                <span className="text-center">
                  <span className="block text-[13px] font-semibold text-text-primary">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-text-tertiary">
                    {option.description}
                  </span>
                </span>
                {selected && (
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent-active"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
