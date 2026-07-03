import { ClockClockwise } from "@phosphor-icons/react";
import { formatTime } from "../../hook/useTicker";
import { StatusBadge } from "../monitoring/StatusBadge";
import type { Driver } from "../../types";
import DriverConstants from "../../constants/drivers";

const {
  EYE_ICONS,
  STATUS_LABEL,
  STATUS_TONE,
  PHONE_ON_ICON,
  PHONE_OFF_ICON,
  SEATBELT_ON_ICON,
  SEATBELT_OFF_ICON,
  WARN_ICON,
} = DriverConstants;

interface DriverRowProps {
  driver: Driver;
}

function earColor(ear: number): string {
  if (ear < 0.17) return "text-red-400";
  if (ear < 0.22) return "text-amber-400";
  return "text-emerald-400";
}

function earHint(ear: number): string {
  if (ear < 0.17) return "Mắt nhắm nghiêm trọng";
  if (ear < 0.22) return "Mắt hơi khép";
  return "Mắt mở bình thường";
}

function avatarTone(status: Driver["status"]): string {
  switch (status) {
    case "critical":
      return "bg-red-500/15 text-red-300";
    case "warn":
      return "bg-amber-500/15 text-amber-300";
    case "offline":
      return "bg-zinc-500/15 text-zinc-400";
    default:
      return "bg-emerald-500/15 text-emerald-300";
  }
}

function DriverRow({ driver }: DriverRowProps) {
  const ear = driver.ear;
  return (
    <tr className="border-b border-hairline/50 transition-colors hover:bg-surface-2/30">
      <td className="py-2.5 pr-3 font-mono-num text-[11px] text-zinc-500">
        {driver.id}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${avatarTone(driver.status)}`}
          >
            {driver.name.charAt(0)}
          </div>
          <span className="text-[12px] font-medium text-zinc-100">
            {driver.name}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-3 font-mono-num text-[11px] text-zinc-400">
        {driver.licensePlate}
      </td>
      <td className="py-2.5 pr-3 text-[11px] text-zinc-400">{driver.team}</td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1.5" title={earHint(ear)}>
          <span className={`font-mono-num text-[12px] font-medium ${earColor(ear)}`}>
            {ear.toFixed(3)}
          </span>
          {EYE_ICONS[driver.eyeState]}
        </div>
      </td>
      <td className="py-2.5 pr-3">
        <StatusBadge
          tone={STATUS_TONE[driver.status]}
          label={STATUS_LABEL[driver.status]}
        />
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1.5">
          {driver.onPhone ? (
            <span
              title="Đang dùng điện thoại"
              className="flex items-center justify-center rounded bg-red-500/10 p-1 text-red-400"
            >
              {PHONE_ON_ICON}
            </span>
          ) : (
            <span className="flex items-center justify-center rounded bg-emerald-500/10 p-1 text-emerald-400/40">
              {PHONE_OFF_ICON}
            </span>
          )}
          {driver.seatbelt ? (
            <span
              title="Đai an toàn"
              className="flex items-center justify-center rounded bg-emerald-500/10 p-1 text-emerald-400/40"
            >
              {SEATBELT_ON_ICON}
            </span>
          ) : (
            <span
              title="Không đai an toàn"
              className="flex items-center justify-center rounded bg-red-500/10 p-1 text-red-400"
            >
              {SEATBELT_OFF_ICON}
            </span>
          )}
        </div>
      </td>
      <td className="py-2.5 pr-3">
        {driver.totalAlerts > 0 ? (
          <span
            className={`inline-flex items-center gap-1 font-mono-num text-[11px] font-medium ${
              driver.totalAlerts >= 5 ? "text-red-300" : "text-amber-300"
            }`}
          >
            {WARN_ICON}
            {driver.totalAlerts}
          </span>
        ) : (
          <span className="font-mono-num text-[11px] text-zinc-600">0</span>
        )}
      </td>
      <td className="py-2.5 pr-3 font-mono-num text-[11px] text-zinc-500">
        {driver.phone}
      </td>
      <td className="py-2.5 pl-3 font-mono-num text-[10px] text-zinc-500">
        <div className="flex items-center gap-1">
          <ClockClockwise size={10} className="text-zinc-600" />
          {formatTime(driver.lastUpdate)}
        </div>
      </td>
    </tr>
  );
}

export default DriverRow;
