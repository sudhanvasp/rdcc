"use client";

import { useState } from "react";
import { Plus, Trash2, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Dot, Badge } from "@/components/ui/Badge";
import { PRIORITY_META, TASK_STATUS_META, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: keyof typeof TASK_STATUS_META;
  priority: keyof typeof PRIORITY_META;
  dueDate: string | Date | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeColor?: string | null;
};

type Dependency = { taskId: string; dependsOnId: string; dependsOnTitle: string; dependsOnStatus: string };

type TeamMember = { id: string; name: string; avatarColor: string };

const COLUMNS: (keyof typeof TASK_STATUS_META)[] = [
  "todo", "in_progress", "blocked", "review", "done",
];

type TaskFormState = {
  title: string;
  description: string;
  assigneeId: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
};

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  assigneeId: "",
  priority: "medium",
  dueDate: "",
};

export function ProjectTasksTab({
  projectId,
  initialTasks,
  teamMembers,
  initialDependencies,
}: {
  projectId: string;
  initialTasks: Task[];
  teamMembers: TeamMember[];
  initialDependencies: Dependency[];
}) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [dependencies, setDependencies] = useState<Dependency[]>(initialDependencies);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
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
    setTasks((prev) => [
      ...prev,
      { ...data.task, assigneeName: assignee?.name ?? null, assigneeColor: assignee?.avatarColor ?? null },
    ]);
    setModalOpen(false);
    setForm(emptyForm);
    toast("Task added");
  }

  async function setStatus(id: string, status: keyof typeof TASK_STATUS_META) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDependencies((prev) => prev.filter((d) => d.taskId !== id && d.dependsOnId !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    toast("Task deleted");
  }

  async function addDependency(taskId: string, dependsOnId: string) {
    if (!dependsOnId || dependsOnId === taskId) return;
    const already = dependencies.some((d) => d.taskId === taskId && d.dependsOnId === dependsOnId);
    if (already) return;
    const dependsOnTask = tasks.find((t) => t.id === dependsOnId);
    if (!dependsOnTask) return;
    setDependencies((prev) => [
      ...prev,
      { taskId, dependsOnId, dependsOnTitle: dependsOnTask.title, dependsOnStatus: dependsOnTask.status },
    ]);
    await fetch("/api/task-dependencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, dependsOnId }),
    });
  }

  async function removeDependency(taskId: string, dependsOnId: string) {
    setDependencies((prev) => prev.filter((d) => !(d.taskId === taskId && d.dependsOnId === dependsOnId)));
    await fetch(`/api/task-dependencies?taskId=${taskId}&dependsOnId=${dependsOnId}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          const meta = TASK_STATUS_META[col];
          return (
            <div key={col} className="rounded-md border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className={`text-[12px] font-medium ${meta.text}`}>{meta.label}</span>
                <span className="text-[11px] text-muted">{colTasks.length}</span>
              </div>
              <div className="space-y-2 p-2">
                {colTasks.map((t) => {
                  const pm = PRIORITY_META[t.priority];
                  const taskDeps = dependencies.filter((d) => d.taskId === t.id);
                  const otherTasks = tasks.filter(
                    (o) => o.id !== t.id && !taskDeps.some((d) => d.dependsOnId === o.id)
                  );
                  return (
                    <div key={t.id} className="group rounded-md border border-line bg-canvas p-2.5">
                      <div className="mb-1.5 flex items-start justify-between gap-1">
                        <div className="flex items-start gap-1.5">
                          <Dot className={`mt-1 shrink-0 ${pm.dot}`} />
                          <span className="text-[12.5px] leading-snug text-ink">{t.title}</span>
                        </div>
                        <button
                          onClick={() => remove(t.id)}
                          className="shrink-0 rounded p-0.5 text-muted opacity-0 hover:text-critical group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {taskDeps.length > 0 && (
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          {taskDeps.map((d) => (
                            <span
                              key={d.dependsOnId}
                              className={`flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10.5px] ${
                                d.dependsOnStatus === "done" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
                              }`}
                              title={`Blocked by: ${d.dependsOnTitle}`}
                            >
                              <Link2 size={9} />
                              {d.dependsOnTitle}
                              <button onClick={() => removeDependency(t.id, d.dependsOnId)} className="hover:opacity-70">
                                <X size={9} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {t.assigneeName && (
                            <Avatar name={t.assigneeName} color={t.assigneeColor ?? undefined} size={16} />
                          )}
                          {t.dueDate && (
                            <span className="text-[11px] text-muted">{formatDate(t.dueDate)}</span>
                          )}
                        </div>
                        <select
                          value={t.status}
                          onChange={(e) => setStatus(t.id, e.target.value as keyof typeof TASK_STATUS_META)}
                          className="rounded border-0 bg-transparent text-[11px] text-muted hover:text-ink focus:outline-none"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c} value={c}>{TASK_STATUS_META[c].label}</option>
                          ))}
                        </select>
                      </div>

                      {otherTasks.length > 0 && (
                        <select
                          value=""
                          onChange={(e) => addDependency(t.id, e.target.value)}
                          className="mt-1.5 w-full rounded border border-dashed border-line bg-transparent px-1 py-0.5 text-[10.5px] text-muted focus:outline-none"
                        >
                          <option value="">+ depends on...</option>
                          {otherTasks.map((o) => (
                            <option key={o.id} value={o.id}>{o.title}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <p className="px-1 py-3 text-center text-[11px] text-muted">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Task" width={460}>
        <div className="space-y-3.5">
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
            <Button onClick={submit} disabled={saving || !form.title.trim()} loading={saving}>
              {saving ? "Adding…" : "Add task"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
