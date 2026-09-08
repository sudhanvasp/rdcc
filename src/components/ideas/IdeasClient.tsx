"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lightbulb, Pencil, Trash2, ArrowRightCircle, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { IDEA_STATUS_META, PRIORITY_META, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  status: keyof typeof IDEA_STATUS_META;
  priority: keyof typeof PRIORITY_META;
  category: string | null;
  estimatedComplexity: "low" | "medium" | "high";
  estimatedDurationDays: number | null;
  potentialTechnologies: string[];
  notes: string | null;
  createdAt: string | Date;
  assigneeId: string | null;
  assigneeName: string | null;
};

type TeamMember = { id: string; name: string; avatarColor: string };

const STATUS_FILTERS: (keyof typeof IDEA_STATUS_META | "all")[] = [
  "all", "inbox", "evaluating", "approved", "rejected", "converted", "archived",
];

type IdeaFormState = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category: string;
  assigneeId: string;
  estimatedDurationDays: string;
  potentialTechnologies: string;
  notes: string;
};

const emptyForm: IdeaFormState = {
  title: "",
  description: "",
  priority: "medium",
  category: "",
  assigneeId: "",
  estimatedDurationDays: "",
  potentialTechnologies: "",
  notes: "",
};

export function IdeasClient({
  initialIdeas,
  teamMembers,
}: {
  initialIdeas: Idea[];
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [items, setItems] = useState<Idea[]>(initialIdeas);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IdeaFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setForm(emptyForm);
      setEditingId(null);
      setModalOpen(true);
      router.replace("/ideas");
    }
  }, [searchParams, router]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(idea: Idea) {
    setForm({
      title: idea.title,
      description: idea.description ?? "",
      priority: idea.priority,
      category: idea.category ?? "",
      assigneeId: idea.assigneeId ?? "",
      estimatedDurationDays: idea.estimatedDurationDays?.toString() ?? "",
      potentialTechnologies: idea.potentialTechnologies.join(", "),
      notes: idea.notes ?? "",
    });
    setEditingId(idea.id);
    setModalOpen(true);
  }

  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      category: form.category || undefined,
      assigneeId: form.assigneeId || null,
      estimatedDurationDays: form.estimatedDurationDays
        ? Number(form.estimatedDurationDays)
        : null,
      potentialTechnologies: form.potentialTechnologies
        ? form.potentialTechnologies.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      notes: form.notes || undefined,
    };

    const res = await fetch(
      editingId ? `/api/ideas/${editingId}` : "/api/ideas",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't save that idea. Try again.", "error");
      return;
    }
    const data = await res.json();
    const saved: Idea = {
      ...data.idea,
      assigneeName: teamMembers.find((m) => m.id === data.idea.assigneeId)?.name ?? null,
    };
    setItems((prev) =>
      editingId ? prev.map((i) => (i.id === editingId ? saved : i)) : [saved, ...prev]
    );
    setModalOpen(false);
    toast(editingId ? "Idea updated" : "Idea created");
  }

  async function changeStatus(id: string, status: keyof typeof IDEA_STATUS_META) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    toast("Idea deleted");
  }

  async function convert(id: string) {
    const res = await fetch(`/api/ideas/${id}/convert`, { method: "POST" });
    if (!res.ok) {
      toast("Couldn't convert that idea. Try again.", "error");
      return;
    }
    const data = await res.json();
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "converted" } : i))
    );
    toast("Converted to project");
    router.push(`/projects/${data.project.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-md border border-line bg-surface p-0.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-[5px] px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                filter === s ? "bg-canvas text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {s === "all" ? "All" : IDEA_STATUS_META[s].label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> New Idea
        </Button>
      </div>

      <Card>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Lightbulb size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No ideas yet</p>
            <p className="text-[13px] text-muted">Capture your first idea to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {visible.map((idea) => {
              const sm = IDEA_STATUS_META[idea.status];
              const pm = PRIORITY_META[idea.priority];
              return (
                <div key={idea.id} className="flex items-start gap-3 px-4 py-3">
                  <Dot className={`mt-1.5 ${pm.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-ink">{idea.title}</span>
                      {idea.category && <Badge>{idea.category}</Badge>}
                    </div>
                    {idea.description && (
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">{idea.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                      {idea.assigneeName && (
                        <span className="flex items-center gap-1">
                          <Avatar name={idea.assigneeName} size={16} /> {idea.assigneeName}
                        </span>
                      )}
                      {idea.estimatedDurationDays && <span>~{idea.estimatedDurationDays}d</span>}
                      <span className="capitalize">{idea.estimatedComplexity} complexity</span>
                      <span>{formatDate(idea.createdAt)}</span>
                    </div>
                  </div>

                  <select
                    value={idea.status}
                    onChange={(e) => changeStatus(idea.id, e.target.value as keyof typeof IDEA_STATUS_META)}
                    className={`rounded-[5px] border-0 px-2 py-0.5 text-[12px] font-medium ${sm.soft} ${sm.text}`}
                  >
                    {Object.entries(IDEA_STATUS_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>

                  {idea.status === "approved" && (
                    <button
                      onClick={() => convert(idea.id)}
                      title="Convert to project"
                      className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-signal"
                    >
                      <ArrowRightCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(idea)}
                    className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(idea.id)}
                    className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-critical"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Idea" : "New Idea"}
        width={520}
      >
        <div className="space-y-3.5">
          <div>
            <Label>Title</Label>
            <Input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Laser Harp"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this idea?"
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
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Interactive Tech"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Owner</Label>
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
              <Label>Est. duration (days)</Label>
              <Input
                type="number"
                min={1}
                value={form.estimatedDurationDays}
                onChange={(e) => setForm({ ...form, estimatedDurationDays: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Potential technologies</Label>
            <Input
              value={form.potentialTechnologies}
              onChange={(e) => setForm({ ...form, potentialTechnologies: e.target.value })}
              placeholder="Arduino, MIDI, TouchDesigner"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title.trim()} loading={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create idea"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
