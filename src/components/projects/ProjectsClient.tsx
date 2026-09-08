"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  PRIORITY_META,
  PROJECT_STATUS_META,
  dueLabel,
} from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type Project = {
  id: string;
  name: string;
  description: string | null;
  priority: keyof typeof PRIORITY_META;
  status: keyof typeof PROJECT_STATUS_META;
  progress: number;
  deadline: string | Date | null;
  category: string | null;
  client: string | null;
  technologies: string[];
};

type TeamMember = { id: string; name: string; avatarColor: string };

const STATUS_FILTERS: (keyof typeof PROJECT_STATUS_META | "all")[] = [
  "all", "idea", "planning", "in_development", "testing", "blocked", "review", "completed", "archived",
];

type ProjectFormState = {
  name: string;
  description: string;
  objective: string;
  priority: "low" | "medium" | "high";
  category: string;
  client: string;
  deadline: string;
  technologies: string;
  memberIds: string[];
};

const emptyForm: ProjectFormState = {
  name: "",
  description: "",
  objective: "",
  priority: "medium",
  category: "",
  client: "",
  deadline: "",
  technologies: "",
  memberIds: [] as string[],
};

export function ProjectsClient({
  initialProjects,
  teamMembers,
}: {
  initialProjects: Project[];
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [items, setItems] = useState<Project[]>(initialProjects);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProjectFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setForm(emptyForm);
      setModalOpen(true);
      router.replace("/projects");
    }
  }, [searchParams, router]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((p) => p.status === filter)),
    [items, filter]
  );

  async function submit() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        objective: form.objective || undefined,
        priority: form.priority,
        category: form.category || undefined,
        client: form.client || undefined,
        deadline: form.deadline || undefined,
        technologies: form.technologies
          ? form.technologies.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        memberIds: form.memberIds,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't create that project. Try again.", "error");
      return;
    }
    const data = await res.json();
    setModalOpen(false);
    toast("Project created");
    router.push(`/projects/${data.project.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1 rounded-md border border-line bg-surface p-0.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-[5px] px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                filter === s ? "bg-canvas text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {s === "all" ? "All" : PROJECT_STATUS_META[s].label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setForm(emptyForm); setModalOpen(true); }}>
          <Plus size={14} /> New Project
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <FolderKanban size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No projects yet</p>
            <p className="text-[13px] text-muted">Approve an idea, or create a project directly.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => {
            const pm = PRIORITY_META[p.priority];
            const sm = PROJECT_STATUS_META[p.status];
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full p-4 transition-colors hover:border-signal/40">
                  <div className="mb-2 flex items-center gap-2">
                    <Dot className={pm.dot} />
                    <h3 className="truncate text-[13px] font-medium text-ink">{p.name}</h3>
                  </div>
                  {p.description && (
                    <p className="mb-3 line-clamp-2 text-[12px] text-muted">{p.description}</p>
                  )}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Badge soft={sm.soft} text={sm.text}>{sm.label}</Badge>
                    {p.category && <Badge>{p.category}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={p.progress} />
                    <span className="shrink-0 text-[12px] text-muted">{p.progress}%</span>
                  </div>
                  <p className="mt-2 text-[12px] text-muted">{dueLabel(p.deadline)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Project" width={520}>
        <div className="space-y-3.5">
          <div>
            <Label>Name</Label>
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Laser Harp"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Objective</Label>
            <Textarea
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              placeholder="What does done look like?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Client</Label>
              <Input
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div>
            <Label>Technologies</Label>
            <Input
              value={form.technologies}
              onChange={(e) => setForm({ ...form, technologies: e.target.value })}
              placeholder="Arduino, ESP32, MIDI"
            />
          </div>
          <div>
            <Label>Team members</Label>
            <div className="flex flex-wrap gap-1.5">
              {teamMembers.map((m) => {
                const checked = form.memberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        memberIds: checked
                          ? f.memberIds.filter((id) => id !== m.id)
                          : [...f.memberIds, m.id],
                      }))
                    }
                    className={`rounded-[5px] border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      checked
                        ? "border-signal bg-signal-soft text-signal"
                        : "border-line text-muted hover:text-ink"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim()} loading={saving}>
              {saving ? "Creating…" : "Create project"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
