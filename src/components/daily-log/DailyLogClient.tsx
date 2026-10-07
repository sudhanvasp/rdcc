"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Globe, Lock, NotebookPen, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { longDate } from "@/lib/work-report-model";

type Entry = {
  id: string;
  userId: string;
  userName: string;
  avatarColor: string;
  projectId: string | null;
  projectName: string | null;
  body: string;
  visibility: "public" | "private";
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function shiftDay(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function weekday(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// Says what actually went wrong instead of one generic message.
async function describeFailure(res: Response): Promise<string> {
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    const data = await res.json().catch(() => null);
    if (data?.error) return data.error;
  }
  if (res.status >= 500) return `Server error (HTTP ${res.status}). Check the runtime logs for details.`;
  return `The request failed (HTTP ${res.status}) before it reached the app.`;
}

export function DailyLogClient({
  date,
  today,
  entries,
  projects,
  members,
  currentUserId,
  isAdmin,
}: {
  date: string;
  today: string;
  entries: Entry[];
  projects: { id: string; name: string }[];
  members: { id: string; name: string }[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);

  const isToday = date === today;

  function goTo(day: string) {
    router.push(day === today ? "/daily-log" : `/daily-log?date=${day}`);
  }

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logDate: date, body: text, projectId: projectId || null, visibility }),
      });
      if (!res.ok) {
        toast(await describeFailure(res), "error");
        return;
      }
      setText("");
      toast("Update added");
      router.refresh();
    } catch {
      toast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Switch one of your own updates between public and private.
  async function toggleVisibility(entry: Entry) {
    const next = entry.visibility === "private" ? "public" : "private";
    const res = await fetch(`/api/daily-logs/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    if (!res.ok) {
      toast(await describeFailure(res), "error");
      return;
    }
    toast(next === "private" ? "Now private: only you can see it" : "Now public: everyone can see it");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this update?")) return;
    const res = await fetch(`/api/daily-logs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast(await describeFailure(res), "error");
      return;
    }
    toast("Update deleted");
    router.refresh();
  }

  // Group the day's entries by person, keeping the order they were written in.
  const byPerson = new Map<string, { name: string; color: string; items: Entry[] }>();
  for (const e of entries) {
    const group = byPerson.get(e.userId) ?? { name: e.userName, color: e.avatarColor, items: [] };
    group.items.push(e);
    byPerson.set(e.userId, group);
  }
  const people = Array.from(byPerson.entries());
  // "Hasn't posted" means no PUBLIC update: a private one is invisible to everyone else.
  const publicAuthors = new Set(entries.filter((e) => e.visibility === "public").map((e) => e.userId));
  const missing = members.filter((m) => !publicAuthors.has(m.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => goTo(shiftDay(date, -1))} aria-label="Previous day">
          <ChevronLeft size={14} />
        </Button>
        <Input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && goTo(e.target.value)}
          className="!w-auto"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => goTo(shiftDay(date, 1))}
          disabled={isToday}
          aria-label="Next day"
        >
          <ChevronRight size={14} />
        </Button>
        {!isToday && (
          <Button size="sm" variant="secondary" onClick={() => goTo(today)}>
            Today
          </Button>
        )}
        <p className="ml-1 text-[13px] font-medium text-ink">
          {weekday(date)}, {longDate(date)}
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-[13px] font-medium text-ink">
          {isToday ? "What are you working on today?" : `Add an update for ${longDate(date)}`}
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          maxLength={2000}
          placeholder="e.g. Finished the BOM sheet for the laser rig and started wiring the relay board"
          className="min-h-[88px]"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="!w-auto min-w-[200px]">
            <option value="">General (no specific project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "public" | "private")}
            className="!w-auto min-w-[190px]"
            aria-label="Who can see this update"
          >
            <option value="public">Public: everyone can see it</option>
            <option value="private">Private: only me</option>
          </Select>
          <Button size="sm" onClick={add} loading={saving} disabled={saving || !text.trim()}>
            <Plus size={14} /> Add update
          </Button>
          <span className="text-[11px] text-muted">Ctrl/⌘ + Enter to add</span>
        </div>
        <p className="text-[11.5px] text-muted">
          Public updates are visible to the whole team. Private ones are only visible to you, and they are left out of reports.
        </p>
      </Card>

      {people.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <NotebookPen size={20} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No updates for this day yet</p>
            <p className="text-[13px] text-muted">Add yours above — the team&rsquo;s updates show up here.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {people.map(([userId, person]) => (
            <Card key={userId}>
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                <Avatar name={person.name} color={person.color} size={28} />
                <p className="text-[13px] font-medium text-ink">{person.name}</p>
                <span className="text-[12px] text-muted">
                  {person.items.length} update{person.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="divide-y divide-line">
                {person.items.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge>{e.projectName ?? "General"}</Badge>
                        {e.userId === currentUserId && (
                          <button
                            onClick={() => toggleVisibility(e)}
                            title={
                              e.visibility === "private"
                                ? "Private: only you can see this. Click to make it public."
                                : "Public: everyone can see this. Click to make it private."
                            }
                            className={`inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11.5px] font-medium ${
                              e.visibility === "private"
                                ? "bg-warning-soft text-warning"
                                : "bg-neutral-soft text-neutral hover:text-ink"
                            }`}
                          >
                            {e.visibility === "private" ? <Lock size={11} /> : <Globe size={11} />}
                            {e.visibility === "private" ? "Private" : "Public"}
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words text-[13px] text-ink">{e.body}</p>
                    </div>
                    {(e.userId === currentUserId || (isAdmin && e.visibility === "public")) && (
                      <button
                        onClick={() => remove(e.id)}
                        title="Delete this update"
                        className="rounded-md p-1.5 text-muted hover:bg-critical-soft hover:text-critical"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <p className="text-[12px] text-muted">
          No public update yet from: {missing.map((m) => m.name).join(", ")}
        </p>
      )}
    </div>
  );
}