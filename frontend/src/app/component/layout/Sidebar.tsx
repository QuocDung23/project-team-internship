import { NavLink } from "react-router-dom";
import {
  Gauge,
  Users,
  Truck,
  Warning,
  Gear,
  SignOut,
  CaretRight,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { ReactElement } from "react";
import { useAuth } from "../../auth/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
  badge?: string;
}

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: "/", label: "Dashboard", icon: <Gauge size={18} weight="duotone" /> },
  { to: "/drivers", label: "Drivers", icon: <Users size={18} weight="duotone" /> },
  { to: "/trips", label: "Trips", icon: <Truck size={18} weight="duotone" /> },
  { to: "/alerts", label: "Alerts", icon: <Warning size={18} weight="duotone" /> },
];

const DRIVER_NAV: ReadonlyArray<NavItem> = [
  { to: "/my-trip", label: "My Trip", icon: <Truck size={18} weight="duotone" /> },
  { to: "/alerts", label: "My Alerts", icon: <Warning size={18} weight="duotone" /> },
];

const SECONDARY_NAV: ReadonlyArray<NavItem> = [
  { to: "/settings", label: "Settings", icon: <Gear size={18} weight="duotone" /> },
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
      className="sticky top-0 flex h-dvh w-[252px] shrink-0 flex-col border-r border-hairline bg-surface/80 px-4 py-5 backdrop-blur-xl"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-emerald-400/20 to-emerald-500/5 ring-1 ring-emerald-500/30">
          <ShieldCheck size={20} weight="duotone" className="text-emerald-400" />
        </div>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-tight text-zinc-100">
            Driver Safety
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {user?.role === "admin" ? "Admin Console" : "Driver Console"}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="group mb-5 flex items-center gap-3 rounded-lg border border-hairline bg-surface-2/60 px-3 py-2.5 text-left transition hover:border-zinc-700"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-300 ring-1 ring-zinc-700">
          API
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[12px] font-medium text-zinc-200">
            Production backend
          </p>
          <p className="truncate text-[10px] text-zinc-500">
            Realtime detector data
          </p>
        </div>
        <CaretRight
          size={12}
          className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-400"
        />
      </button>

      <nav className="flex flex-1 flex-col gap-7 overflow-y-auto">
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

      <div className="mt-4 border-t border-hairline pt-4">
        <div className="mb-3 flex items-center gap-2 px-2 text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span>Central backend live</span>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-amber-400/20 to-amber-500/5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12px] font-medium text-zinc-200">
              {user?.full_name ?? "User"}
            </p>
            <p className="truncate text-[10px] text-zinc-500">
              {user?.email ?? "Signed in"}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Sign out"
          >
            <SignOut size={14} />
          </button>
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
      <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">{children}</ul>
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
            "group flex items-center gap-3 rounded-md px-2.5 py-2 text-[12.5px] font-medium transition",
            isActive
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25"
              : "text-zinc-400 hover:bg-surface-2/70 hover:text-zinc-100",
          ].join(" ")
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-transparent text-zinc-500 group-hover:text-zinc-300"
              }`}
            >
              {item.icon}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className="ml-auto rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-rose-300 ring-1 ring-rose-500/25">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}
