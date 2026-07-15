import { LucideTruck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppLocale } from "../../i18n/useAppLocale";
import type { FleetViewMode } from "../../types/fleets";

interface FleetHeaderProps {
  now: number;
  viewMode: FleetViewMode;
  onViewModeChange: (next: FleetViewMode) => void;
}

const VIEW_OPTIONS: ReadonlyArray<{ value: FleetViewMode; labelKey: "pages.fleetOverview.view.all" | "pages.fleetOverview.view.waiting" }> = [
  { value: "all", labelKey: "pages.fleetOverview.view.all" },
  { value: "waiting", labelKey: "pages.fleetOverview.view.waiting" },
];

const VIEW_ACTIVE: Record<FleetViewMode, string> = {
  all: "bg-accent-active/20 text-accent-active",
  waiting: "bg-accent-active/20 text-accent-active",
};

function FleetHeader({ now, viewMode, onViewModeChange }: FleetHeaderProps) {
  const { t } = useTranslation("trips");
  const { formatTime: localizedTime } = useAppLocale();

  return (
    <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-active/10 ring-1 ring-accent-active/20">
          <LucideTruck
            size={20}
            strokeWidth={1.5}
            className="text-accent-active"
          />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-text-primary">
            {t("pages.fleetOverview.title")}
          </h1>
          <p className="mt-0.5 text-[12px] text-text-tertiary">
            {t("pages.fleetOverview.subtitle")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-lg border border-hairline bg-subtle-bg px-3 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-active" />
          <span className="font-mono-num text-[11px] text-text-secondary">
            {localizedTime(new Date(now))}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-hairline bg-subtle-bg p-1">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onViewModeChange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-300 ${
                viewMode === opt.value
                  ? VIEW_ACTIVE[opt.value] + " shadow-sm"
                  : "text-text-tertiary hover:bg-subtle-bg-hover hover:text-text-secondary"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export default FleetHeader;
