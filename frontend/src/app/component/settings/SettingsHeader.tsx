import { motion, useReducedMotion } from "motion/react";

interface SettingsHeaderProps {
  isDirty: boolean;
  lastSavedAt: number | null;
  isSaving: boolean;
  isLive: boolean;
  onSave: () => void;
}

export default function SettingsHeader({
  isDirty,
  lastSavedAt,
  isSaving,
  isLive,
  onSave,
}: SettingsHeaderProps) {
  const reduceMotion = useReducedMotion();

  const getStatusText = () => {
    if (isDirty) return "Unsaved changes";
    if (lastSavedAt) return `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`;
    return "No changes";
  };

  const getStatusColor = () => {
    if (isDirty) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <div className="mb-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">
          System Settings
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Detection Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isLive
              ? "Supported runtime settings are loaded from the backend"
              : "Backend is unavailable, showing defaults"}
          </p>
        </div>

        <motion.div
          className="flex items-center gap-4"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <motion.span
            key={getStatusText()}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`text-[11px] font-medium ${getStatusColor()}`}
          >
            {getStatusText()}
          </motion.span>

          <motion.button
            type="button"
            onClick={onSave}
            disabled={isSaving || !isDirty}
            whileHover={reduceMotion ? {} : { scale: 1.02 }}
            whileTap={reduceMotion ? {} : { scale: 0.98 }}
            className="group inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-[12px] font-medium text-emerald-400 ring-1 ring-emerald-500/30 transition-colors hover:bg-emerald-500/20 hover:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </motion.span>
            ) : (
              <motion.svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </motion.svg>
            )}
            <span>Save Changes</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.header>
  );
}
