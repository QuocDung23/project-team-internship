import { NavLink } from "react-router-dom";
import {
  Gauge,
  Users,
  Truck,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Activity,
  Building2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactElement } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useMyDriverProfile } from "../../hook/useBackendData";

interface NavItem {
  to: string;
  icon: ReactElement;
  translationKey:
    | "primary.dashboard"
    | "primary.drivers"
    | "primary.trips"
    | "primary.alerts"
    | "primary.myTrip"
    | "primary.myAlerts"
    | "primary.settings";
  badge?: string;
}

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: "/", icon: <Gauge size={18} strokeWidth={1.7} />, translationKey: "primary.dashboard" },
  {
    to: "/drivers",
    icon: <Users size={18} strokeWidth={1.7} />,
    translationKey: "primary.drivers",
  },
  { to: "/trips", icon: <Truck size={18} strokeWidth={1.7} />, translationKey: "primary.trips" },
  {
    to: "/alerts",
    icon: <AlertTriangle size={18} strokeWidth={1.7} />,
    translationKey: "primary.alerts",
  },
];

const DRIVER_NAV: ReadonlyArray<NavItem> = [
  {
    to: "/my-trip",
    icon: <Truck size={18} strokeWidth={1.7} />,
    translationKey: "primary.myTrip",
  },
  {
    to: "/alerts",
    icon: <AlertTriangle size={18} strokeWidth={1.7} />,
    translationKey: "primary.myAlerts",
  },
];

const DRIVER_SECONDARY_NAV: ReadonlyArray<NavItem> = [
  {
    to: "/user-settings",
    icon: <Settings size={18} strokeWidth={1.7} />,
    translationKey: "primary.settings",
  },
];

const SECONDARY_NAV: ReadonlyArray<NavItem> = [
  {
    to: "/settings",
    icon: <Settings size={18} strokeWidth={1.7} />,
    translationKey: "primary.settings",
  },
];

export function Sidebar() {
  const { t } = useTranslation(["navigation", "common"]);
  const { user, logout } = useAuth();
  const myDriver = useMyDriverProfile(user?.role === "driver");
  const primaryNav = user?.role === "driver" ? DRIVER_NAV : PRIMARY_NAV;
  const secondaryNav = user?.role === "admin" ? SECONDARY_NAV : DRIVER_SECONDARY_NAV;
  const displayName = myDriver.row?.full_name ?? user?.full_name ?? t("user.fallbackName");
  const displayEmail = myDriver.row?.email ?? user?.email ?? t("user.signedIn");
  const initials = (displayName ?? displayEmail)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className="sticky top-0 flex h-dvh w-[252px] shrink-0 flex-col border-r border-hairline bg-surface/70 px-3 py-5 backdrop-blur-2xl"
      aria-label={t("aria.primaryNavigation")}
    >
      {/* Brand mark: Double-Bezel outer shell + inner core, concentric radii. */}
      <div className="flex items-center gap-2.5 rounded-2xl px-2 pb-6">
        <div className="rounded-[14px] border border-hairline bg-subtle-bg p-[1.5px]">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-accent-active/25 text-accent-active"
            style={{
              background:
                "linear-gradient(180deg, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.06) 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 18px -6px var(--theme-shadow)",
            }}
          >
            <ShieldCheck size={18} strokeWidth={1.7} />
          </div>
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-tight text-text-primary">
            {t("common:brand.name")}
          </p>
          <p className="font-mono-num text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {user?.role === "admin" ? t("console.admin") : t("console.driver")}
          </p>
        </div>
      </div>

      {/* Workspace switcher: Double-Bezel nested architecture, tactile press, trailing chevron. */}
      <button
        type="button"
        className="group mb-5 flex items-center gap-3 rounded-2xl border border-hairline bg-subtle-bg p-[1.5px] text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-hairline hover:bg-subtle-bg-hover active:scale-[0.99]"
      >
        <div className="flex w-full items-center gap-3 rounded-[14px] bg-surface-2/40 px-2.5 py-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-2 text-[10px] font-bold tracking-wide text-text-secondary"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            <Building2 size={12} strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-medium text-text-primary">
              {t("workspace.backend")}
            </p>
            <p className="truncate text-[10px] text-text-tertiary">
              {t("workspace.description")}
            </p>
          </div>
          <ChevronRight
            size={14}
            strokeWidth={1.7}
            className="shrink-0 text-text-tertiary transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:text-text-secondary"
          />
        </div>
      </button>

      <nav className="flex flex-1 flex-col gap-7 overflow-y-auto px-1">
        <SidebarSection label={t("sections.operations")}>
          {primaryNav.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </SidebarSection>

        {secondaryNav.length > 0 && (
          <SidebarSection label={t("sections.system")}>
            {secondaryNav.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </SidebarSection>
        )}
      </nav>

      {/* Footer: live-status card (real semantic state) + user card (Double-Bezel). */}
      <div className="mt-4 grid gap-3 px-1">
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-subtle-bg px-2.5 py-2 font-mono-num text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent-active/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-active" />
          </span>
          <Activity
            size={12}
            strokeWidth={1.7}
            className="text-accent-active/80"
          />
          <span className="text-text-secondary">{t("workspace.live")}</span>
        </div>

        <div className="rounded-2xl border border-hairline bg-subtle-bg p-[1.5px]">
          <div className="flex items-center gap-3 rounded-[14px] bg-surface-2/40 px-2 py-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-warn/25 font-mono-num text-[11px] font-semibold tracking-wide text-accent-warn"
              style={{
                background:
                  "linear-gradient(180deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.06) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 18px -6px var(--theme-shadow)",
              }}
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12px] font-medium text-text-primary">
                {displayName}
              </p>
              <p className="truncate text-[10px] text-text-tertiary">
                {displayEmail}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-text-tertiary transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-hairline hover:bg-subtle-bg-hover hover:text-text-primary active:scale-[0.94]"
              aria-label={t("aria.signOut")}
            >
              <LogOut size={16} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface SidebarSectionProps {
  label: string;
  children: ReactElement | ReactElement[];
}

function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <div>
      <p className="mb-2 px-2.5 font-mono-num text-[10px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
        {label}
      </p>
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

interface SidebarLinkProps {
  item: NavItem;
}

function SidebarLink({ item }: SidebarLinkProps) {
  const { t } = useTranslation("navigation");
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === "/"}
        className={({ isActive }) =>
          [
            "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isActive
              ? "bg-accent-active/8 text-accent-active ring-1 ring-accent-active/20"
              : "text-text-secondary ring-1 ring-transparent hover:bg-subtle-bg-hover hover:text-text-primary hover:ring-hairline",
          ].join(" ")
        }
      >
        {({ isActive }) => (
          <>
            <span
              aria-hidden
              className={`absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-accent-active transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isActive
                  ? "opacity-100 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
                  : "opacity-0 group-hover:opacity-40 group-hover:bg-text-tertiary group-hover:shadow-none"
              }`}
            />
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isActive
                  ? "bg-accent-active/15 text-accent-active ring-1 ring-accent-active/25"
                  : "bg-subtle-bg text-text-tertiary ring-1 ring-hairline group-hover:text-text-primary group-hover:ring-hairline"
              }`}
            >
              {item.icon}
            </span>
            <span className="flex-1 truncate">{t(item.translationKey)}</span>
            {item.badge && (
              <span className="ml-auto rounded-full bg-accent-critical/15 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold tabular-nums text-accent-critical ring-1 ring-accent-critical/25">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}
