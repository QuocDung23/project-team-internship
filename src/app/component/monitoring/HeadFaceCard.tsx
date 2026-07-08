import type { ReactNode } from "react";
import {
  Eye,
  EyeSlash,
  Phone,
  Warning,
  ShieldCheck,
} from "@phosphor-icons/react";
import { StatusBadge } from "./StatusBadge";
import type { MetricStatus } from "../../data/mockMetrics";

interface HeadFaceCardProps {
  eyesOpen: boolean;
  mouthClosed: boolean;
  onPhone: boolean;
  seatbelt: boolean;
  status: MetricStatus;
}

const STATUS_LABEL: Record<MetricStatus, string> = {
  active: "Bình thường",
  warn: "Cần chú ý",
  critical: "Bất thường",
};

export function HeadFaceCard({
  eyesOpen,
  mouthClosed,
  onPhone,
  seatbelt,
  status,
}: HeadFaceCardProps) {
  const items: Row[] = [
    {
      icon: eyesOpen ? (
        <Eye size={14} weight="bold" />
      ) : (
        <EyeSlash size={14} weight="bold" />
      ),
      label: "Mắt",
      value: eyesOpen ? "Mở" : "Nhắm",
      ok: eyesOpen,
    },
    {
      icon: <Warning size={14} weight="bold" />,
      label: "Miệng",
      value: mouthClosed ? "Đóng" : "Đang mở / ngáp",
      ok: mouthClosed,
    },
    {
      icon: <Phone size={14} weight="bold" />,
      label: "Điện thoại",
      value: onPhone ? "Phát hiện" : "Không",
      ok: !onPhone,
    },
    {
      icon: <ShieldCheck size={14} weight="bold" />,
      label: "Dây an toàn",
      value: seatbelt ? "Đã cài" : "Chưa cài",
      ok: seatbelt,
    },
  ];

  return (
    <div className="panel flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Trạng thái đầu / mặt
        </span>
        <StatusBadge tone={status} label={STATUS_LABEL[status]} />
      </div>

      <ul className="divide-y divide-zinc-800/80">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between py-1.5 text-[12px]"
          >
            <span className="flex items-center gap-2 text-zinc-400">
              <span className={item.ok ? "text-emerald-300" : "text-rose-300"}>
                {item.icon}
              </span>
              {item.label}
            </span>
            <span
              className={`font-medium ${item.ok ? "text-zinc-200" : "text-rose-300"}`}
            >
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Row {
  icon: ReactNode;
  label: string;
  value: string;
  ok: boolean;
}
