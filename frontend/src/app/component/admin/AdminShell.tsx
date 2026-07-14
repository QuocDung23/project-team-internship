import type { ReactNode } from "react";

const PAGE_PADDING = "p-5 md:p-6 lg:p-7";

function AdminPage({
  children,
  scroll = false,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col gap-5 ${PAGE_PADDING} ${scroll ? "overflow-hidden" : ""}`}
    >
      {children}
    </div>
  );
}

function AdminHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rounded-xl border border-white/5 bg-white/[0.03] px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[15px] font-semibold tracking-tight text-zinc-100">
            {title}
          </h1>
          <p className="mt-0.5 text-[12px] text-zinc-400">{description}</p>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

function AdminErrorBanner({
  label,
  message,
}: {
  label: string;
  message: string | null | undefined;
}) {
  if (!message) return null;
  return (
    <section className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-200">
      {label}: {message}
    </section>
  );
}

function AdminEmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-8 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function AdminStatStrip({
  items,
}: {
  items: ReadonlyArray<{
    label: string;
    value: string | number;
    tone?: "neutral" | "active" | "warn" | "critical";
    detail?: string;
  }>;
}) {
  const toneClass = {
    neutral: "text-zinc-100",
    active: "text-emerald-300",
    warn: "text-amber-300",
    critical: "text-red-300",
  };
  return (
    <section className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {item.label}
          </p>
          <p className={`mt-1 font-mono-num text-2xl font-semibold ${toneClass[item.tone ?? "neutral"]}`}>
            {item.value}
          </p>
          {item.detail ? <p className="mt-1 truncate text-[11px] text-zinc-500">{item.detail}</p> : null}
        </div>
      ))}
    </section>
  );
}

export {
  AdminPage,
  AdminHeader,
  AdminErrorBanner,
  AdminEmptyState,
  AdminStatStrip,
};
