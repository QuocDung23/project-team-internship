import { useTranslation } from "react-i18next";
import DriverRow from "./DriverRow";
import type { Driver } from "../../types";

interface DriverTableProps {
  drivers: Driver[];
  totalCount: number;
  updatingDriverId?: string | null;
  onClearFilters: () => void;
  onSelectDriver?: (driver: Driver) => void;
  onSetAvailability?: (driver: Driver, enabled: boolean) => void;
}

function DriverTable({
  drivers,
  totalCount,
  updatingDriverId = null,
  onClearFilters,
  onSelectDriver,
  onSetAvailability,
}: DriverTableProps) {
  const { t } = useTranslation("drivers");
  const filteredOut = drivers.length < totalCount;
  return (
    <div className="panel flex flex-1 flex-col gap-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-[12px]">
          <thead className="sticky top-0 z-10 border-b border-hairline bg-surface-1 text-[10px] uppercase tracking-wider text-text-tertiary">
            <tr>
              <th className="px-4 py-3 font-medium">
                {t("table.columns.driver")}
              </th>
              <th className="py-3 pr-4 font-medium">
                {t("table.columns.vehiclePlate")}
              </th>
              <th className="py-3 pr-4 font-medium">
                {t("table.columns.status")}
              </th>
              <th className="py-3 pr-4 font-medium">
                {t("table.columns.alerts")}
              </th>
              <th className="py-3 pr-4 font-medium">
                {t("table.columns.contact")}
              </th>
              <th className="py-3 pl-3 pr-4 font-medium">
                {t("table.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/50">
            {drivers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-[12px] text-text-tertiary"
                >
                  {t("table.empty")}
                </td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <DriverRow
                  key={driver.id}
                  driver={driver}
                  isUpdating={updatingDriverId === driver.id}
                  onSelect={onSelectDriver}
                  onSetAvailability={onSetAvailability}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-hairline px-4 py-3 text-[11px] text-text-tertiary">
        {t("table.summary", { shown: drivers.length, total: totalCount })}
        {filteredOut ? (
          <button
            type="button"
            onClick={onClearFilters}
            aria-label={t("table.clearFilters")}
            className="ml-2 text-accent-active hover:text-accent-active/80"
          >
            {t("table.clearFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default DriverTable;
