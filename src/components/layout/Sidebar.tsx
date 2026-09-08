"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV, PHASE_1_ROUTES } from "./nav";

export function Sidebar({
  isAdmin,
  mobileOpen,
  onCloseMobile,
}: {
  isAdmin: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const primaryNav = PRIMARY_NAV.filter((item) => item.href !== "/billing" || isAdmin);
  const secondaryNav = SECONDARY_NAV.filter(
    (item) => (item.href !== "/settings" && item.href !== "/audit-log") || isAdmin
  );

  useEffect(() => {
    const stored = localStorage.getItem("rdcc.sidebar.collapsed");
    if (stored) setCollapsed(stored === "1");
  }, []);

  // Closing on navigation matters only on mobile (the drawer), but calling
  // it unconditionally is harmless on desktop since it's already a no-op there.
  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem("rdcc.sidebar.collapsed", c ? "0" : "1");
      return !c;
    });
  }

  return (
    <>
      {/* Backdrop \u2014 mobile only, shown while the drawer is open */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-line bg-surface transition-transform duration-150 md:static md:translate-x-0 md:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-[64px]" : "w-[228px]"
        )}
      >
      <div className="flex h-14 items-center gap-2 border-b border-line px-4">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-signal text-[11px] font-bold text-white">
          R
        </div>
        {(!collapsed || mobileOpen) && (
          <span className="truncate text-[13px] font-semibold text-ink">
            R&D Command Center
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {primaryNav.map((item) => {
          const active = pathname.startsWith(item.href);
          const enabled = PHASE_1_ROUTES.has(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                active
                  ? "bg-signal-soft text-signal"
                  : "text-muted hover:bg-canvas hover:text-ink",
                collapsed && !mobileOpen && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} strokeWidth={2} className="shrink-0" />
              {(!collapsed || mobileOpen) && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {(!collapsed || mobileOpen) && item.href === "/ai" && (
                <span className="rounded-full bg-signal-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-signal">
                  Beta
                </span>
              )}
              {(!collapsed || mobileOpen) && !enabled && (
                <span className="text-[10px] font-normal text-neutral">soon</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-line px-2 py-3">
        {secondaryNav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-colors",
                active
                  ? "bg-signal-soft text-signal"
                  : "text-muted hover:bg-canvas hover:text-ink",
                collapsed && !mobileOpen && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} strokeWidth={2} className="shrink-0" />
              {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
        <button
          onClick={toggle}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium text-muted transition-colors hover:bg-canvas hover:text-ink",
            collapsed && !mobileOpen && "justify-center px-0"
          )}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {(!collapsed || mobileOpen) && <span>Collapse</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
