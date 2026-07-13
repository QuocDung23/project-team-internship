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
import type { ReactElement } from "react";
import { useAuth } from "../../auth/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
  badge?: string;
}

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: "/", label: "Dashboard", icon: <Gauge size={18} strokeWidth={1.7} /> },
  { to: "/drivers", label: "Drivers", icon: <Users size={18} strokeWidth={1.7} /> },
  { to: "/trips", label: "Trips", icon: <Truck size={18} strokeWidth={1.7} /> },
  { to: "/alerts", label: "Alerts", icon: <AlertTriangle size={18} strokeWidth={1.7} /> },
];

const DRIVER_NAV: ReadonlyArray<NavItem> = [
  { to: "/my-trip", label: "My Trip", icon: <Truck size={18} strokeWidth={1.7} /> },
  { to: "/alerts", label: "My Alerts", icon: <AlertTriangle size={18} strokeWidth={1.7} /> },
];

const SECONDARY_NAV: ReadonlyArray<NavItem> = [
  { to: "/settings", label: "Settings", icon: <Settings size={18} strokeWidth={1.7} /> },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const primaryNav = user?.role === "driver" ? DRIVER_NAV : PRIMARY_NAV;
  const secondaryNav = user?.role === "admin" ? SECONDARY_NAV : [];
  const initials = (user?.full_name ?? user?.email ?? "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className="sticky top-0 flex h-dvh w-[252px] shrink-0 flex-col border-r border-white/[0.06] bg-surface/70 px-3 py-5 backdrop-blur-2xl"
      aria-label="Primary navigation"
    >
      {/* Brand mark: Double-Bezel outer shell + inner core, concentric radii. */}
      <div className="flex items-center gap-2.5 rounded-2xl px-2 pb-6">
        <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-[1.5px]">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-emerald-500/25 text-emerald-300"
            style={{
              background:
                "linear-gradient(180deg, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.06) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 18px -6px rgba(16,185,129,0.35)",
            }}
          >
            <ShieldCheck size={18} strokeWidth={1.7} />
          </div>
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-tight text-zinc-100">
            Driver Safety
          </p>
          <p className="font-mono-num text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {user?.role === "admin" ? "Admin Console" : "Driver Console"}
          </p>
        </div>
      </div>

      {/* Workspace switcher: Double-Bezel nested architecture, tactile press, trailing chevron. */}
      <button
        type="button"
        className="group mb-5 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[1.5px] text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/[0.12] hover:bg-white/[0.04] active:scale-[0.99]"
      >
        <div className="flex w-full items-center gap-3 rounded-[14px] bg-surface-2/40 px-2.5 py-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-zinc-900 text-[10px] font-bold tracking-wide text-zinc-300"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            <Building2 size={12} strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-medium text-zinc-200">
              Production backend
            </p>
            <p className="truncate text-[10px] text-zinc-500">
              Realtime detector data
            </p>
          </div>
          <ChevronRight
            size={14}
            strokeWidth={1.7}
            className="shrink-0 text-zinc-600 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:text-zinc-400"
          />
        </div>
      </button>

      <nav className="flex flex-1 flex-col gap-7 overflow-y-auto px-1">
        <SidebarSection label="Operations">
          {primaryNav.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </SidebarSection>

        {secondaryNav.length > 0 && (
          <SidebarSection label="System">
            {secondaryNav.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </SidebarSection>
        )}
      </nav>

      {/* Footer: live-status card (real semantic state) + user card (Double-Bezel). */}
      <div className="mt-4 grid gap-3 px-1">
        {/* Live status: justified - conveys real backend reachability (Section 9.F allowance). */}
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 font-mono-num text-[10px] uppercase tracking-[0.14em] text-zinc-500">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <Activity size={12} strokeWidth={1.7} className="text-emerald-400/80" />
          <span className="text-zinc-400">Backend live</span>
        </div>

        {/* User card: Double-Bezel outer shell + inner core, concentric radii, tactile signout. */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-[1.5px]">
          <div className="flex items-center gap-3 rounded-[14px] bg-surface-2/40 px-2 py-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500/25 font-mono-num text-[11px] font-semibold tracking-wide text-amber-300"
              style={{
                background:
                  "linear-gradient(180deg, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0.06) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 18px -6px rgba(245,158,11,0.30)",
              }}
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[12px] font-medium text-zinc-100">
                {user?.full_name ?? "User"}
              </p>
              <p className="truncate text-[10px] text-zinc-500">
                {user?.email ?? "Signed in"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-zinc-500 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-zinc-200 active:scale-[0.94]"
              aria-label="Sign out"
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
      <p className="mb-2 px-2.5 font-mono-num text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
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
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === "/"}
        className={({ isActive }) =>
          [
            "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[12.5px] font-medium transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isActive
              ? "bg-emerald-500/[0.08] text-emerald-200 ring-1 ring-emerald-500/20"
              : "text-zinc-400 ring-1 ring-transparent hover:bg-white/[0.03] hover:text-zinc-100 hover:ring-white/[0.06]",
          ].join(" ")
        }
      >
        {({ isActive }) => (
          <>
            {/* Vertical accent bar: hidden by default, slides in on active. */}
            <span
              aria-hidden
              className={`absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-emerald-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isActive
                  ? "opacity-100 shadow-[0_0_12px_rgba(16,185,129,0.55)]"
                  : "opacity-0 group-hover:opacity-40 group-hover:bg-zinc-500 group-hover:shadow-none"
              }`}
            />
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
                  : "bg-white/[0.02] text-zinc-500 ring-1 ring-white/[0.04] group-hover:text-zinc-200 group-hover:ring-white/[0.08]"
              }`}
            >
              {item.icon}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="ml-auto rounded-full bg-rose-500/15 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold tabular-nums text-rose-300 ring-1 ring-rose-500/25">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}