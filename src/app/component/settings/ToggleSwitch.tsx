interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
}

export default function ToggleSwitch({
  enabled,
  onChange,
  label,
  description,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      {label && (
        <div>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {label}
          </p>
          {description && (
            <p
              className="mt-0.5 text-[10px]"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      <button
        onClick={() => onChange(!enabled)}
        className="relative h-6 w-11 rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{
          backgroundColor: enabled
            ? "var(--color-accent-active)"
            : "var(--color-surface-2)",
          border: `1px solid ${
            enabled ? "var(--color-accent-active)" : "var(--color-hairline)"
          }`,
        }}
        role="switch"
        aria-checked={enabled}
      >
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full shadow transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            left: enabled ? "calc(100% - 20px)" : "3px",
            backgroundColor: enabled ? "#ffffff" : "var(--color-text-tertiary)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </button>
    </div>
  );
}
