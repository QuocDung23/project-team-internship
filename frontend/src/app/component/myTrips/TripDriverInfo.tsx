import { motion } from "motion/react";
import { Envelope, IdentificationCard, UserCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { BackendDriver } from "../../services/backendApi";
import { SPRING } from "../../utils/trips/tripMotion";

interface TripDriverInfoProps {
  driver: BackendDriver | null;
  isLoading: boolean;
}

interface DriverField {
  label: string;
  value: string;
  icon: ReactNode;
}

export default function TripDriverInfo({
  driver,
  isLoading,
}: TripDriverInfoProps) {
  const fields: DriverField[] = [
    {
      label: "Driver",
      value: driver?.full_name ?? "-",
      icon: <UserCircle size={15} weight="duotone" />,
    },
    {
      label: "Email",
      value: driver?.email ?? "-",
      icon: <Envelope size={15} weight="duotone" />,
    },
    {
      label: "License",
      value: driver?.license_number ?? "-",
      icon: <IdentificationCard size={15} weight="duotone" />,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.1 }}
      className="bezel-shell"
    >
      <div className="bezel-core relative overflow-hidden px-5 py-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 accent-radial-emerald opacity-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-px bg-linear-to-b from-transparent via-accent-active/40 to-transparent"
        />

        <div className="relative grid gap-3 md:grid-cols-3">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-subtle-bg px-4 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-subtle-bg text-accent-active">
                {field.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                  {field.label}
                </p>
                <p className="mt-0.5 truncate font-mono-num text-[13px] font-medium text-text-primary">
                  {isLoading ? (
                    <span className="inline-block h-3.5 w-28 animate-pulse rounded bg-subtle-bg" />
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
