import { motion } from "motion/react";
import type { BackendDriver } from "../../services/backendApi";
import { SPRING } from "../../utils/trips/tripMotion";

interface TripDriverInfoProps {
  driver: BackendDriver | null;
  isLoading: boolean;
}

interface DriverField {
  label: string;
  value: string;
  icon: React.ReactNode;
}

export default function TripDriverInfo({ driver, isLoading }: TripDriverInfoProps) {
  const fields: DriverField[] = [
    {
      label: "Tài xế",
      value: driver?.full_name ?? "-",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      label: "Email",
      value: driver?.email ?? "-",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
    {
      label: "Giấy phép",
      value: driver?.license_number ?? "-",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
      ),
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.1 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-[1.5px]"
    >
      <div className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] border border-white/[0.05] bg-gradient-to-br from-zinc-950/90 via-zinc-950/80 to-zinc-900/60 px-5 py-4">
        {/* Subtle radial accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            background: "radial-gradient(ellipse at 100% 50%, rgba(16,185,129,0.4) 0%, transparent 60%)",
          }}
        />

        <div className="relative grid gap-3 text-sm md:grid-cols-3">
          {fields.map((field, i) => (
            <div
              key={field.label}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400">
                {field.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{field.label}</p>
                <p className="mt-0.5 truncate font-mono-num text-sm font-medium text-zinc-100">
                  {isLoading ? (
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
                  ) : (
                    field.value
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
