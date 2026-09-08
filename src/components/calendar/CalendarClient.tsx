"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { PRIORITY_META, TASK_STATUS_META } from "@/lib/utils";

type ProjectEvent = {
  id: string;
  name: string;
  deadline: string | Date;
  priority: keyof typeof PRIORITY_META;
};

type TaskEvent = {
  id: string;
  title: string;
  dueDate: string | Date;
  projectId: string;
  status: keyof typeof TASK_STATUS_META;
};

type CalEvent = {
  id: string;
  title: string;
  date: string | Date;
};

export function CalendarClient({
  projectEvents,
  taskEvents,
  initialEvents,
}: {
  projectEvents: ProjectEvent[];
  taskEvents: TaskEvent[];
  initialEvents: CalEvent[];
}) {
  const toast = useToast();
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalEvent[]>(initialEvents);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  function eventsFor(day: Date) {
    const dayProjects = projectEvents.filter((p) => isSameDay(new Date(p.deadline), day));
    const dayTasks = taskEvents.filter((t) => isSameDay(new Date(t.dueDate), day));
    const dayCustom = events.filter((e) => isSameDay(new Date(e.date), day));
    return { dayProjects, dayTasks, dayCustom };
  }

  const selected = selectedDay ? eventsFor(selectedDay) : null;

  async function addEvent() {
    if (!newTitle.trim() || !selectedDay) return;
    setSaving(true);
    const res = await fetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), date: selectedDay.toISOString() }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't add that event. Try again.", "error");
      return;
    }
    const data = await res.json();
    setEvents((prev) => [...prev, data.event]);
    setNewTitle("");
    toast("Event added");
  }

  async function removeEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-medium text-ink">{format(month, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:text-ink"
          >
            <ChevronLeft size={15} />
          </button>
          <Button size="sm" variant="secondary" onClick={() => setMonth(new Date())}>Today</Button>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:text-ink"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-line">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const { dayProjects, dayTasks, dayCustom } = eventsFor(day);
            const items = [
              ...dayProjects.map((p) => ({ kind: "project" as const, ...p })),
              ...dayTasks.map((t) => ({ kind: "task" as const, ...t })),
              ...dayCustom.map((e) => ({ kind: "event" as const, ...e })),
            ];
            const inMonth = isSameMonth(day, month);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[92px] border-b border-r border-line p-1.5 text-left align-top last:border-r-0 hover:bg-canvas/60 ${
                  inMonth ? "bg-surface" : "bg-canvas"
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[12px] ${
                    isToday(day) ? "bg-signal text-white" : inMonth ? "text-ink" : "text-muted"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayProjects.slice(0, 2).map((p) => (
                    <div key={p.id} className={`truncate rounded px-1 py-0.5 text-[10.5px] font-medium ${PRIORITY_META[p.priority].soft} ${PRIORITY_META[p.priority].text}`}>
                      {p.name}
                    </div>
                  ))}
                  {dayTasks.slice(0, Math.max(0, 2 - dayProjects.length)).map((t) => (
                    <div key={t.id} className="truncate rounded bg-neutral-soft px-1 py-0.5 text-[10.5px] text-muted">
                      {t.title}
                    </div>
                  ))}
                  {dayCustom.slice(0, Math.max(0, 2 - dayProjects.length - dayTasks.length)).map((e) => (
                    <div key={e.id} className="truncate rounded bg-signal-soft px-1 py-0.5 text-[10.5px] text-signal">
                      {e.title}
                    </div>
                  ))}
                  {items.length > 2 && (
                    <p className="px-1 text-[10.5px] text-muted">+{items.length - 2} more</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Modal
        open={!!selectedDay}
        onClose={() => {
          setSelectedDay(null);
          setNewTitle("");
        }}
        title={selectedDay ? format(selectedDay, "EEEE, MMMM d") : ""}
        width={440}
      >
        {selected && (
          <div className="space-y-3">
            <div className="space-y-2">
              {selected.dayProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block rounded-md border border-line px-3 py-2 hover:bg-canvas"
                >
                  <p className="text-[13px] text-ink">{p.name}</p>
                  <p className="text-[11px] text-muted">Project deadline</p>
                </Link>
              ))}
              {selected.dayTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.projectId}?tab=tasks`}
                  className="block rounded-md border border-line px-3 py-2 hover:bg-canvas"
                >
                  <p className="text-[13px] text-ink">{t.title}</p>
                  <p className="text-[11px] text-muted">Task due · {TASK_STATUS_META[t.status].label}</p>
                </Link>
              ))}
              {selected.dayCustom.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                  <p className="text-[13px] text-ink">{e.title}</p>
                  <button onClick={() => removeEvent(e.id)} className="text-muted hover:text-critical">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {selected.dayProjects.length === 0 && selected.dayTasks.length === 0 && selected.dayCustom.length === 0 && (
                <p className="py-4 text-center text-[13px] text-muted">Nothing on this day yet.</p>
              )}
            </div>

            <div className="flex gap-2 border-t border-line pt-3">
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="Add an event..."
                className="flex-1"
              />
              <Button size="sm" onClick={addEvent} disabled={saving || !newTitle.trim()} loading={saving}>
                <Plus size={13} />
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
