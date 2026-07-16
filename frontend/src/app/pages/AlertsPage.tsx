import { useCallback, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBackendAlerts } from "../hook/useBackendAlerts";
import { useBackendDrivers } from "../hook/useBackendData";
import { useAuth } from "../auth/AuthContext";

import type {
  AlertsStats,
  FleetAlertEvent,
  SeverityFilter,
  TypeFilter,
} from "../types/alerts";
import type { Driver } from "../types";
import AlertHeader from "../component/alerts/AlertHeader";
import AlertStatsRow from "../component/alerts/AlertStatsRow";
import AlertFilters from "../component/alerts/AlertFilters";
import AlertList from "../component/alerts/AlertList";
import { acknowledgeAlert } from "../services/backendAlerts";
import { AdminErrorBanner, AdminPage } from "../component/admin/AdminShell";
import { getErrorTranslation } from "../i18n/errors";

const EMPTY_EVENTS: FleetAlertEvent[] = [];
const EMPTY_DRIVERS: Driver[] = [];

export function AlertsPage() {
  const { t } = useTranslation("alerts");
  const translate = t as unknown as (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [driverIdFilter, setDriverIdFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showAcknowledged, setShowAcknowledged] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const backendDrivers = useBackendDrivers(isAdmin);
  const backendAlerts = useBackendAlerts(undefined, {
    driverId: isAdmin ? driverIdFilter || undefined : undefined,
    severity: severityFilter === "all" ? undefined : severityFilter,
    status: "all",
  });
  const events = backendAlerts.fleetEvents ?? EMPTY_EVENTS;
  const drivers = backendDrivers.drivers ?? EMPTY_DRIVERS;

  const handleAcknowledge = useCallback(
    async (event: FleetAlertEvent) => {
      if (event.acknowledged || acknowledgingId) return;
      setAcknowledgingId(event.id);
      setActionError(null);
      try {
        await acknowledgeAlert(event.id);
        await backendAlerts.refresh();
      } catch (err) {
        setActionError(err);
      } finally {
        setAcknowledgingId(null);
      }
    },
    [acknowledgingId, backendAlerts],
  );

  const handleAcknowledgeGroup = useCallback(
    async (groupEvents: FleetAlertEvent[], groupId: string) => {
      if (acknowledgingId) return;
      const pendingEvents = groupEvents.filter((event) => !event.acknowledged);
      if (pendingEvents.length === 0) return;

      setAcknowledgingId(groupId);
      setActionError(null);
      try {
        await Promise.all(pendingEvents.map((event) => acknowledgeAlert(event.id)));
        await backendAlerts.refresh();
      } catch (err) {
        setActionError(err);
      } finally {
        setAcknowledgingId(null);
      }
    },
    [acknowledgingId, backendAlerts],
  );

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (!showAcknowledged && e.acknowledged) return false;
        if (severityFilter !== "all" && e.severity !== severityFilter)
          return false;
        if (typeFilter !== "all" && e.type !== typeFilter) return false;
        return true;
      }),
    [events, severityFilter, typeFilter, showAcknowledged],
  );

  const stats: AlertsStats = useMemo(
    () => ({
      total: events.length,
      critical: events.filter(
        (e) => e.severity === "critical" && !e.acknowledged,
      ).length,
      warn: events.filter((e) => e.severity === "warn" && !e.acknowledged)
        .length,
      acknowledged: events.filter((e) => e.acknowledged).length,
    }),
    [events],
  );

  const alertsErrorMessage = useMemo(() => {
    if (!backendAlerts.error) return null;
    const translation = getErrorTranslation(backendAlerts.error);
    return translate(translation.key, translation.values);
  }, [backendAlerts.error, translate]);

  const driversErrorMessage = useMemo(() => {
    if (!isAdmin || !backendDrivers.error) return null;
    const translation = getErrorTranslation(backendDrivers.error);
    return translate(translation.key, translation.values);
  }, [backendDrivers.error, isAdmin, translate]);

  const actionErrorMessage = useMemo(() => {
    if (!actionError) return null;
    const translation = getErrorTranslation(actionError, "alerts:errors.acknowledgeFailed");
    return translate(translation.key, translation.values);
  }, [actionError, translate]);

  return (
    <AdminPage scroll>
      <AlertHeader
        criticalCount={stats.critical}
        warnCount={stats.warn}
        onRefresh={() => {
          if (backendAlerts.isLive) {
            void backendAlerts.refresh();
          }
        }}
      />

      <AdminErrorBanner
        label={t("errors.banners.backendUnavailable")}
        message={alertsErrorMessage}
      />
      <AdminErrorBanner
        label={t("errors.banners.driversUnavailable")}
        message={driversErrorMessage}
      />

      <AdminErrorBanner
        label={t("errors.banners.actionFailed")}
        message={actionErrorMessage}
      />

      <AlertStatsRow stats={stats} />

      <AlertFilters
        severityFilter={severityFilter}
        typeFilter={typeFilter}
        showAcknowledged={showAcknowledged}
        onSeverityChange={setSeverityFilter}
        onTypeChange={setTypeFilter}
        onToggleAcknowledged={setShowAcknowledged}
      />

      {isAdmin ? (
        <section className="panel px-4 py-3">
          <DriverFilterDropdown
            drivers={drivers}
            selectedDriverId={driverIdFilter}
            onDriverChange={setDriverIdFilter}
          />
        </section>
      ) : null}

      <AlertList
        events={filtered}
        acknowledgingId={acknowledgingId}
        onAcknowledge={handleAcknowledge}
        onAcknowledgeGroup={handleAcknowledgeGroup}
      />
    </AdminPage>
  );
}

function DriverFilterDropdown({
  drivers,
  selectedDriverId,
  onDriverChange,
}: {
  drivers: Driver[];
  selectedDriverId: string;
  onDriverChange: (next: string) => void;
}) {
  const { t } = useTranslation("alerts");
  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const visibleQuery = open ? query : selectedDriver?.name ?? "";
  const filteredDrivers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return drivers;
    return drivers.filter((driver) => {
      const haystack = [
        driver.name,
        driver.licenseNumber,
        driver.licensePlate,
        driver.email,
      ].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [drivers, query]);

  return (
    <div
      className="relative grid max-w-xl gap-1 text-[11px] text-text-secondary"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <span>{t("driverFilter.label")}</span>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          value={visibleQuery}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (selectedDriverId) onDriverChange("");
          }}
          className="w-full rounded-md border border-hairline bg-subtle-bg py-2 pl-9 pr-9 text-[12px] text-text-primary outline-none focus:border-accent-active/50"
          placeholder={t("driverFilter.placeholder")}
        />
        {selectedDriverId ? (
          <button
            type="button"
            onClick={() => {
              onDriverChange("");
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-text-tertiary hover:bg-subtle-bg-hover hover:text-text-primary"
            aria-label={t("driverFilter.clearAria")}
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-hairline bg-surface p-1 shadow-xl shadow-black/30">
          <button
            type="button"
            onClick={() => {
              onDriverChange("");
              setQuery("");
              setOpen(false);
            }}
            className={`grid w-full gap-0.5 rounded px-3 py-2 text-left text-[12px] hover:bg-subtle-bg-hover ${
              selectedDriverId ? "text-text-secondary" : "bg-subtle-bg-hover text-accent-active"
            }`}
          >
            {t("driverFilter.allDrivers")}
          </button>
          {filteredDrivers.length === 0 ? (
            <div className="px-3 py-3 text-[12px] text-text-tertiary">
              {t("driverFilter.noMatches")}
            </div>
          ) : (
            filteredDrivers.map((driver) => (
              <button
                key={driver.id}
                type="button"
                onClick={() => {
                  onDriverChange(driver.id);
                  setQuery("");
                  setOpen(false);
                }}
                className={`grid w-full gap-0.5 rounded px-3 py-2 text-left hover:bg-subtle-bg-hover ${
                  selectedDriverId === driver.id ? "bg-accent-active/10 text-accent-active" : "text-text-secondary"
                }`}
              >
                <span className="truncate text-[12px] font-medium">{driver.name}</span>
                <span className="truncate font-mono-num text-[10px] text-text-tertiary">
                  {driver.licenseNumber} - {driver.email}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
