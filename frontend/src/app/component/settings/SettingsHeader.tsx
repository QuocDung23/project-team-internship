import { Loader2, Save } from "lucide-react";
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
    if (isDirty) return "text-accent-warn";
    return "text-accent-active";
  };

  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-8"
    >
      <div className="mb-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-tertiary">
          System Settings
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Detection Settings
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
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
            className="group inline-flex items-center gap-2 rounded-full bg-accent-active/10 px-4 py-2 text-[12px] font-medium text-accent-active ring-1 ring-accent-active/30 transition-colors hover:bg-accent-active/20 hover:ring-accent-active/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? (
              <Loader2 size={14} strokeWidth={2.4} className="animate-spin" />
            ) : (
              <Save size={14} strokeWidth={2.4} />
            )}
            <span>Save Changes</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.header>
  );
}
