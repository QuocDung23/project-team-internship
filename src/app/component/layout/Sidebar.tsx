// Primary navigation sidebar for the Sentinel Fleet console.
// Glassmorphism panel pinned on the left, the rest of the viewport is the
// content area rendered through React Router.

import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Gauge,
  VideoCamera,
  Users,
  Truck,
  Warning,
  Gear,
  SignOut,
  CaretRight,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { ReactElement } from "react";
import { Logout } from "./Logout";

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
  badge?: string;
}

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { to: "/", label: "Dashboard", icon: <Gauge size={18} weight="duotone" /> },
  {
    to: "/monitoring",
    label: "Giám sát lái xe",
    icon: <VideoCamera size={18} weight="duotone" />,
  },
  {
    to: "/drivers",
    label: "Tài xế",
    icon: <Users size={18} weight="duotone" />,
  },
  { to: "/fleet", label: "Đội xe", icon: <Truck size={18} weight="duotone" /> },
  {
    to: "/alerts",
    label: "Cảnh báo",
    icon: <Warning size={18} weight="duotone" />,
    badge: "3",
  },
];

const SECONDARY_NAV: ReadonlyArray<NavItem> = [
  {
    to: "/settings",
    label: "Cài đặt",
    icon: <Gear size={18} weight="duotone" />,
  },
];

// Mock user data - in production, get from auth context
const CURRENT_USER = {
  name: "Phạm Thanh Toàn",
  role: "Điều phối viên ca 3",
  initials: "PT",
};

export function Sidebar() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <>
      <aside
        className="sticky top-0 flex h-dvh w-[252px] shrink-0 flex-col px-4 py-5 backdrop-blur-xl transition-colors duration-300"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-hairline)',
        }}
        aria-label="Sidebar điều hướng chính"
      >
        {/* Brand block */}
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              background: `linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)`,
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <ShieldCheck
              size={20}
              weight="duotone"
              style={{ color: 'var(--color-accent-active)' }}
            />
          </div>
          <div className="leading-tight">
            <p
              className="text-[13px] font-semibold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Sentinel Fleet
            </p>
            <p
              className="text-[10px] uppercase tracking-[0.16em]"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Operations Console
            </p>
          </div>
        </div>

        {/* Workspace switcher */}
        <button
          type="button"
          className="group mb-5 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-300 hover:border-opacity-60"
          style={{
            borderColor: 'var(--color-hairline)',
            backgroundColor: 'rgba(var(--color-surface-2), 0.6)',
          }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-hairline)',
            }}
          >
            KV1
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p
              className="truncate text-[12px] font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Khu vực 1
            </p>
            <p
              className="truncate text-[10px]"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              12 xe đang hoạt động
            </p>
          </div>
          <CaretRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
        </button>

        {/* Primary navigation */}
        <nav className="flex flex-1 flex-col gap-7 overflow-y-auto">
          <SidebarSection label="Vận hành">
            {PRIMARY_NAV.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </SidebarSection>

          <SidebarSection label="Hệ thống">
            {SECONDARY_NAV.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </SidebarSection>
        </nav>

        {/* Operator identity + connection state */}
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid var(--color-hairline)' }}
        >
          <div
            className="mb-3 flex items-center gap-2 px-2 text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.6)' }}
              />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: 'var(--color-accent-active)' }}
              />
            </span>
            <span>Central backend · live</span>
          </div>

          <div
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
            style={{ backgroundColor: 'transparent' }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{
                background: `linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)`,
                color: 'var(--color-accent-warn)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              {CURRENT_USER.initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p
                className="truncate text-[12px] font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {CURRENT_USER.name}
              </p>
              <p
                className="truncate text-[10px]"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {CURRENT_USER.role}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
              aria-label="Đăng xuất"
            >
              <SignOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Logout confirmation modal */}
      <Logout
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        userName={CURRENT_USER.name}
        userRole={CURRENT_USER.role}
      />
    </>
  );
}

interface SidebarSectionProps {
  label: string;
  children: ReactElement | ReactElement[];
}

function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <div>
      <p
        className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.16em]"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
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
            "group flex items-center gap-3 rounded-md px-2.5 py-2 text-[12.5px] font-medium transition-all duration-200",
            isActive
              ? "ring-1"
              : "",
          ].join(" ")
        }
        style={({ isActive }) =>
          isActive
            ? {
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--color-accent-active)',
                ringColor: 'rgba(16, 185, 129, 0.25)',
              }
            : {
                color: 'var(--color-text-secondary)',
              }
        }
      >
        {({ isActive }) => (
          <>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-200"
              style={
                isActive
                  ? {
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--color-accent-active)',
                    }
                  : {
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-tertiary)',
                    }
              }
            >
              {item.icon}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--color-accent-critical)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}
