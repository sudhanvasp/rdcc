"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type Experiment = {
  id: string;
  name: string;
  hypothesis: string | null;
  actualResult: string | null;
  conclusion: string | null;
  date: string | Date;
  projectId: string;
  projectName: string | null;
};

type ProjectOpt = { id: string; name: string };

const emptyForm = { projectId: "", name: "", hypothesis: "", setup: "" };

export function ExperimentsClient({
  initialExperiments,
  projects,
}: {
  initialExperiments: Experiment[];
  projects: ProjectOpt[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<Experiment[]>(initialExperiments);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, projectId: projects[0]?.id ?? "" });
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => (projectFilter === "all" ? items : items.filter((e) => e.projectId === projectFilter)),
    [items, projectFilter]
  );

  async function submit() {
    if (!form.name.trim() || !form.projectId) return;
    setSaving(true);
    const res = await fetch("/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't log that experiment. Try again.", "error");
      return;
    }
    const data = await res.json();
    const project = projects.find((p) => p.id === data.experiment.projectId);
    setItems((prev) => [{ ...data.experiment, projectName: project?.name ?? null }, ...prev]);
    setModalOpen(false);
    toast("Experiment logged");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Log Experiment
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <FlaskConical size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No experiments logged yet</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((exp) => (
            <Card key={exp.id} className="p-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h3 className="truncate text-[13px] font-medium text-ink">{exp.name}</h3>
                <span className="shrink-0 text-[11px] text-muted">{formatDate(exp.date)}</span>
              </div>
              {exp.projectName && (
                <Link href={`/projects/${exp.projectId}`} className="mb-2 inline-block">
                  <Badge soft="bg-info-soft" text="text-info">{exp.projectName}</Badge>
                </Link>
              )}
              {exp.hypothesis && (
                <p className="mb-1 line-clamp-2 text-[12.5px] text-muted">
                  <span className="font-medium text-ink">Hypothesis: </span>{exp.hypothesis}
                </p>
              )}
              {(exp.actualResult || exp.conclusion) && (
                <p className="line-clamp-2 text-[12.5px] text-muted">
                  <span className="font-medium text-ink">Result: </span>
                  {exp.conclusion ?? exp.actualResult}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Experiment" width={480}>
        <div className="space-y-3.5">
          <div>
            <Label>Project</Label>
            <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Experiment name</Label>
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Hypothesis</Label>
            <Textarea value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} />
          </div>
          <div>
            <Label>Setup</Label>
            <Textarea value={form.setup} onChange={(e) => setForm({ ...form, setup: e.target.value })} />
          </div>
          <p className="text-[12px] text-muted">
            Open it from its project&rsquo;s Experiments tab to fill in expected/actual results and a conclusion.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim() || !form.projectId} loading={saving}>
              Log experiment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
