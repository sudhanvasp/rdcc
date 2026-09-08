"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  relatedProjectId: string | null;
  relatedTaskId: string | null;
  createdAt: string;
};

// Fallback destination by notification type, used when there's no
// relatedProjectId/relatedTaskId to route by directly.
const TYPE_DESTINATIONS: Record<string, string> = {
  digest_pending: "/settings",
  subscription_renewing: "/billing",
  registration_pending: "/team",
  idea_created: "/ideas",
  event_reminder: "/calendar",
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function openNotification(n: Notification) {
    setOpen(false);
    if (!n.isRead) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.relatedProjectId) router.push(`/projects/${n.relatedProjectId}`);
    else if (n.relatedTaskId) router.push(`/tasks`);
    else if (TYPE_DESTINATIONS[n.type]) router.push(TYPE_DESTINATIONS[n.type]);
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function clearAll() {
    await fetch("/api/notifications/clear-all", { method: "POST" });
    setItems([]);
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[9px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-80 rounded-md border border-line bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[13px] font-medium text-ink">Notifications</span>
            <div className="flex items-center gap-2.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-ink"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-critical"
                >
                  <Trash2 size={12} /> Clear all
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-[13px] text-muted">Nothing yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-line px-3 py-2.5 text-left last:border-b-0 hover:bg-canvas ${
                    n.isRead ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex w-full items-center gap-1.5">
                    {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />}
                    <span className="text-[12.5px] font-medium text-ink">{n.title}</span>
                  </div>
                  {n.body && <span className="text-[12px] text-muted">{n.body}</span>}
                  <span className="text-[11px] text-muted">{formatDate(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
