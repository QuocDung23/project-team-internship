import React, { type FormEvent } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  AtSign,
  IdCard,
  MapPin,
  Phone,
  Activity,
  ShieldCheck,
  User,
} from "lucide-react";
import DriverTextField from "./DriverTextField";
import DriverActivityPanel from "./DriverActivityPanel";
import {
  SPRING,
  type DriverFormState,
} from "../../utils/drivers/driverFormHelpers";

const PASSWORD_MIN_LENGTH = 12;

export default function DriverFormSections({
  mode,
  form,
  setForm,
  isDrivingForSelected,
  selectedBackendDriverStatus,
  selectedDriverId,
  selectedDriverTrips,
  selectedDriverAlerts,
  hasLinkedTrips,
  averageScore,
  totalAlerts,
  criticalAlerts,
  formError,
  onSubmit,
}: {
  mode: "create" | "manage";
  form: DriverFormState;
  setForm: React.Dispatch<React.SetStateAction<DriverFormState>>;
  isDrivingForSelected: boolean;
  selectedBackendDriverStatus: string | undefined;
  selectedDriverId: string | null;
  selectedDriverTrips: Parameters<typeof DriverActivityPanel>[0]["trips"];
  selectedDriverAlerts: Parameters<typeof DriverActivityPanel>[0]["alerts"];
  hasLinkedTrips: boolean;
  averageScore: number | null;
  totalAlerts: number;
  criticalAlerts: number;
  formError: string | null;
  onSubmit: (event: FormEvent) => void;
}) {
  const { t } = useTranslation("drivers");
  return (
    <form id="driver-form" onSubmit={onSubmit} className="grid gap-4">
      {formError ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          role="alert"
          className="rounded-xl border border-accent-warn/25 bg-accent-warn/8 px-3.5 py-2.5 text-[12px] leading-relaxed text-accent-warn"
          style={{
            boxShadow: "inset 0 1px 0 var(--theme-subtle-border)",
          }}
        >
          {formError}
        </motion.div>
      ) : null}

      {mode === "manage" ? (
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-subtle-bg px-3.5 py-2 text-[11px] text-text-tertiary">
          <IdCard size={13} strokeWidth={2} className="text-text-secondary" aria-hidden />
          <span className="uppercase tracking-[0.14em]">
            {t("form.driverIdLabel")}
          </span>
          <span className="font-mono-num text-text-primary">
            {selectedDriverId}
          </span>
        </div>
      ) : null}

      <div className="rounded-2xl border border-hairline bg-subtle-bg p-[1.5px]">
        <div className="grid gap-3 rounded-[calc(1rem-1.5px)] bg-surface p-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
            <User size={12} strokeWidth={2} className="text-accent-active" aria-hidden />
            {t("form.identitySection")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DriverTextField
              icon={<User size={13} strokeWidth={2} />}
              label={t("form.fields.fullName")}
              value={form.fullName}
              required
              onChange={(fullName) =>
                setForm((current) => ({ ...current, fullName }))
              }
            />
            <DriverTextField
              icon={<IdCard size={13} strokeWidth={2} />}
              label={t("form.fields.licenseNumber")}
              value={form.licenseNumber}
              required
              onChange={(licenseNumber) =>
                setForm((current) => ({ ...current, licenseNumber }))
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-subtle-bg p-[1.5px]">
        <div className="grid gap-3 rounded-[calc(1rem-1.5px)] bg-surface p-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
            <MapPin size={12} strokeWidth={2} className="text-accent-active" aria-hidden />
            {t("form.contactSection")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DriverTextField
              icon={<Phone size={13} strokeWidth={2} />}
              label={t("form.fields.phoneNumber")}
              value={form.phone}
              onChange={(phone) =>
                setForm((current) => ({ ...current, phone }))
              }
            />
            <DriverTextField
              icon={<AtSign size={13} strokeWidth={2} />}
              label={t("form.fields.loginEmail")}
              value={form.email}
              type="email"
              onChange={(email) =>
                setForm((current) => ({ ...current, email }))
              }
            />
          </div>
          {mode === "create" ? (
            <DriverTextField
              icon={<ShieldCheck size={13} strokeWidth={2} />}
              label={t("form.fields.initialPassword")}
              value={form.password}
              required
              type="password"
              hint={t("form.passwordHint", { min: PASSWORD_MIN_LENGTH })}
              onChange={(password) =>
                setForm((current) => ({ ...current, password }))
              }
            />
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-subtle-bg p-[1.5px]">
        <div className="grid gap-2 rounded-[calc(1rem-1.5px)] bg-surface p-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
            <Activity size={12} strokeWidth={2} className="text-accent-active" aria-hidden />
            {t("form.statusSection")}
          </div>
          <label className="grid gap-1.5 text-[11px] text-text-secondary">
            <span className="font-medium">{t("form.availabilityLabel")}</span>
            <select
              value={form.status}
              disabled={
                selectedBackendDriverStatus === "active" && isDrivingForSelected
              }
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as DriverFormState["status"],
                }))
              }
              className="rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-[12px] text-text-primary outline-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-accent-active/50 focus:bg-surface focus:shadow-[0_0_0_3px_var(--theme-focus-ring)]"
            >
              <option value="active">{t("form.statusAvailable")}</option>
              <option value="inactive">{t("form.statusLocked")}</option>
            </select>
            {isDrivingForSelected ? (
              <span className="mt-1 text-[10px] leading-relaxed text-text-tertiary">
                {t("form.onTripNote")}
              </span>
            ) : null}
          </label>
        </div>
      </div>

      {mode === "manage" ? (
        <DriverActivityPanel
          trips={selectedDriverTrips}
          alerts={selectedDriverAlerts}
          hasLinkedTrips={hasLinkedTrips}
          averageScore={averageScore}
          totalAlerts={totalAlerts}
          criticalAlerts={criticalAlerts}
        />
      ) : null}
    </form>
  );
}
