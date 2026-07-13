import React, { type FormEvent } from "react";
import { motion } from "motion/react";
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
  return (
    <form id="driver-form" onSubmit={onSubmit} className="grid gap-4">
      {formError ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-200"
          style={{
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {formError}
        </motion.div>
      ) : null}

      {mode === "manage" ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[11px] text-zinc-500">
          <IdCard size={13} strokeWidth={2} className="text-zinc-400" />
          <span className="uppercase tracking-[0.14em] text-zinc-500">
            Driver ID
          </span>
          <span className="font-mono-num text-zinc-200">
            {selectedDriverId}
          </span>
        </div>
      ) : null}

      {/* Identity section */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[1.5px]">
        <div className="grid gap-3 rounded-[calc(1rem-1.5px)] bg-zinc-950/40 p-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            <User size={12} strokeWidth={2} className="text-emerald-400" />
            Thông tin định danh
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DriverTextField
              icon={<User size={13} strokeWidth={2} />}
              label="Họ và tên"
              value={form.fullName}
              required
              onChange={(fullName) =>
                setForm((current) => ({ ...current, fullName }))
              }
            />
            <DriverTextField
              icon={<IdCard size={13} strokeWidth={2} />}
              label="Số bằng lái"
              value={form.licenseNumber}
              required
              onChange={(licenseNumber) =>
                setForm((current) => ({ ...current, licenseNumber }))
              }
            />
          </div>
        </div>
      </div>

      {/* Contact section */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[1.5px]">
        <div className="grid gap-3 rounded-[calc(1rem-1.5px)] bg-zinc-950/40 p-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            <MapPin size={12} strokeWidth={2} className="text-emerald-400" />
            Liên lạc
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DriverTextField
              icon={<Phone size={13} strokeWidth={2} />}
              label="Số điện thoại"
              value={form.phone}
              onChange={(phone) =>
                setForm((current) => ({ ...current, phone }))
              }
            />
            <DriverTextField
              icon={<AtSign size={13} strokeWidth={2} />}
              label="Email đăng nhập"
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
              label="Mật khẩu khởi tạo"
              value={form.password}
              required
              type="password"
              hint="Tối thiểu 12 ký tự."
              onChange={(password) =>
                setForm((current) => ({ ...current, password }))
              }
            />
          ) : null}
        </div>
      </div>

      {/* Availability */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[1.5px]">
        <div className="grid gap-2 rounded-[calc(1rem-1.5px)] bg-zinc-950/40 p-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            <Activity size={12} strokeWidth={2} className="text-emerald-400" />
            Trạng thái hoạt động
          </div>
          <label className="grid gap-1.5 text-[11px] text-zinc-400">
            <span className="font-medium">Khả dụng</span>
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
              className="rounded-xl border border-white/[0.08] bg-zinc-950/60 px-3 py-2 text-[12px] text-zinc-100 outline-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-emerald-500/50 focus:bg-zinc-950/80 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.10)]"
            >
              <option value="active">Sẵn sàng / đang rảnh</option>
              <option value="inactive">Tạm khoá</option>
            </select>
            {isDrivingForSelected ? (
              <span className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                Tài xế đang trong ca lái, không thể khoá cho đến khi chuyến kết
                thúc.
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
