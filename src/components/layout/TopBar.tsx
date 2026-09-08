"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Plus, Search, LogOut, Menu } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationsBell } from "./NotificationsBell";
import type { SessionPayload } from "@/lib/auth";

export function TopBar({
  title,
  user,
  onOpenPalette,
  onOpenMobileMenu,
}: {
  title: string;
  user: SessionPayload;
  onOpenPalette: () => void;
  onOpenMobileMenu: () => void;
}) {
  const router = useRouter();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(e.target as Node))
        setQuickAddOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onOpenMobileMenu}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink md:hidden"
        >
          <Menu size={18} />
        </button>
        <h1 className="truncate text-[14px] font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onOpenPalette}
          className="flex h-8 items-center gap-2 rounded-md border border-line px-2 text-[13px] text-muted hover:bg-canvas sm:px-2.5"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search</span>
          <span className="kbd ml-2 hidden sm:inline">⌘K</span>
        </button>

        <ThemeToggle />

        <NotificationsBell />

        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setQuickAddOpen((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-signal px-2.5 text-[13px] font-medium text-white hover:bg-[#2350bd] sm:px-3"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New</span>
          </button>
          {quickAddOpen && (
            <div className="absolute right-0 z-40 mt-1.5 w-44 rounded-md border border-line bg-surface py-1 shadow-lg">
              {[
                { label: "New Idea", href: "/ideas?new=1" },
                { label: "New Project", href: "/projects?new=1" },
                { label: "New Task", href: "/tasks?new=1" },
              ].map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    setQuickAddOpen(false);
                    router.push(item.href);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-canvas"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-transparent transition-all hover:ring-line"
          >
            <Avatar name={user.name} size={30} />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 z-40 mt-1.5 w-44 rounded-md border border-line bg-surface py-1 shadow-lg">
              <div className="border-b border-line px-3 py-2">
                <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
                <p className="truncate text-[12px] text-muted">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-ink hover:bg-canvas"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
