import type { ReactNode } from "react";
import { X } from "lucide-react";

export function AdminDialog({
  title,
  description,
  children,
  footer,
  width = "md",
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg";
  onClose: () => void;
}) {
  return (
    <div
      className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`panel flex max-h-[calc(100vh-2rem)] w-full flex-col ${width === "lg" ? "max-w-4xl" : "max-w-lg"} overflow-hidden shadow-[0_24px_80px_-48px_var(--theme-shadow)]`}>
        <header className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <h2 id="admin-dialog-title" className="text-sm font-semibold text-text-primary">
              {title}
            </h2>
            {description ? <p className="mt-1 text-xs text-text-tertiary">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary"
            aria-label="Close dialog"
          >
            <X size={14} />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-hairline px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
