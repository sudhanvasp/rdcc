"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { PRIORITY_META, TASK_STATUS_META, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type Task = {
  id: string;
  title: string;
  status: keyof typeof TASK_STATUS_META;
  priority: keyof typeof PRIORITY_META;
  dueDate: string | Date | null;
  projectId: string;
  projectName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
};

type ProjectOpt = { id: string; name: string };
type TeamMember = { id: string; name: string; avatarColor: string };

const STATUS_FILTERS: (keyof typeof TASK_STATUS_META | "all")[] = [
  "all", "todo", "in_progress", "blocked", "review", "done",
];

type TaskFormState = {
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
};

const emptyForm: TaskFormState = {
  projectId: "",
  title: "",
  description: "",
  assigneeId: "",
  priority: "medium",
  dueDate: "",
};

export function TasksClient({
  initialTasks,
  projects,
  teamMembers,
}: {
  initialTasks: Task[];
  projects: ProjectOpt[];
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>({ ...emptyForm, projectId: projects[0]?.id ?? "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setForm({ ...emptyForm, projectId: projects[0]?.id ?? "" });
      setModalOpen(true);
      router.replace("/tasks");
    }
  }, [searchParams, router, projects]);

  const visible = useMemo(() => {
    return tasks
      .filter((t) => statusFilter === "all" || t.status === statusFilter)
      .filter((t) => assigneeFilter === "all" || t.assigneeId === assigneeFilter)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, statusFilter, assigneeFilter]);

  async function setStatus(id: string, status: keyof typeof TASK_STATUS_META) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function submit() {
    if (!form.title.trim() || !form.projectId) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.projectId,
        title: form.title,
        description: form.description || undefined,
        assigneeId: form.assigneeId || null,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't add that task. Try again.", "error");
      return;
    }
    const data = await res.json();
    const assignee = teamMembers.find((m) => m.id === data.task.assigneeId);
    const project = projects.find((p) => p.id === data.task.projectId);
    setTasks((prev) => [
      {
        ...data.task,
        assigneeName: assignee?.name ?? null,
        assigneeColor: assignee?.avatarColor ?? null,
        projectName: project?.name ?? null,
      },
      ...prev,
    ]);
    setModalOpen(false);
    toast("Task added");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-md border border-line bg-surface p-0.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-[5px] px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                  statusFilter === s ? "bg-canvas text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {s === "all" ? "All" : TASK_STATUS_META[s].label}
              </button>
            ))}
          </div>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-md border border-line bg-surface px-2.5 py-1 text-[12px] text-ink"
          >
            <option value="all">Everyone</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> New Task
        </Button>
      </div>

      <Card>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ListChecks size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No tasks match this filter</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {visible.map((t) => {
              const pm = PRIORITY_META[t.priority];
              const sm = TASK_STATUS_META[t.status];
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Dot className={pm.dot} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{t.title}</p>
                    {t.projectName && (
                      <Link
                        href={`/projects/${t.projectId}`}
                        className="text-[12px] text-muted hover:text-signal hover:underline"
                      >
                        {t.projectName}
                      </Link>
                    )}
                  </div>
                  {t.assigneeName && (
                    <span className="hidden items-center gap-1.5 sm:flex">
                      <Avatar name={t.assigneeName} color={t.assigneeColor ?? undefined} size={18} />
                      <span className="text-[12px] text-muted">{t.assigneeName}</span>
                    </span>
                  )}
                  {t.dueDate && (
                    <span className="hidden text-[12px] text-muted sm:inline">{formatDate(t.dueDate)}</span>
                  )}
                  <select
                    value={t.status}
                    onChange={(e) => setStatus(t.id, e.target.value as keyof typeof TASK_STATUS_META)}
                    className={`rounded-[5px] border-0 px-2 py-0.5 text-[12px] font-medium ${sm.soft} ${sm.text}`}
                  >
                    {Object.entries(TASK_STATUS_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Task" width={460}>
        <div className="space-y-3.5">
          <div>
            <Label>Project</Label>
            <Select
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assignee</Label>
              <Select
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as "low" | "medium" | "high" })}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Due date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title.trim() || !form.projectId} loading={saving}>
              {saving ? "Adding…" : "Add task"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
