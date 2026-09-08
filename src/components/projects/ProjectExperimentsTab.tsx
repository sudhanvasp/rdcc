"use client";

import { useState } from "react";
import { Plus, Trash2, FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type Experiment = {
  id: string;
  name: string;
  hypothesis: string | null;
  objective: string | null;
  setup: string | null;
  variables: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  conclusion: string | null;
  date: string | Date;
};

const emptyForm = {
  name: "",
  hypothesis: "",
  objective: "",
  setup: "",
  variables: "",
  expectedResult: "",
  actualResult: "",
  conclusion: "",
};

export function ProjectExperimentsTab({
  projectId,
  initialExperiments,
}: {
  projectId: string;
  initialExperiments: Experiment[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<Experiment[]>(initialExperiments);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function submit() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        ...Object.fromEntries(
          Object.entries(form).map(([k, v]) => [k, v || undefined])
        ),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't log that experiment. Try again.", "error");
      return;
    }
    const data = await res.json();
    setItems((prev) => [data.experiment, ...prev]);
    setModalOpen(false);
    setForm(emptyForm);
    toast("Experiment logged");
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/experiments/${id}`, { method: "DELETE" });
    toast("Experiment deleted");
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Log Experiment
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <FlaskConical size={20} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No experiments logged yet</p>
            <p className="text-[13px] text-muted">Track hypotheses and results as you test.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((exp, idx) => {
            const isOpen = expanded === exp.id;
            return (
              <Card key={exp.id}>
                <button
                  onClick={() => setExpanded(isOpen ? null : exp.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-[13px] font-medium text-ink">
                      Experiment #{String(items.length - idx).padStart(2, "0")} — {exp.name}
                    </p>
                    <p className="text-[12px] text-muted">{formatDate(exp.date)}</p>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                </button>
                {isOpen && (
                  <div className="space-y-2.5 border-t border-line px-4 py-3 text-[13px]">
                    {exp.hypothesis && <Field label="Hypothesis" value={exp.hypothesis} />}
                    {exp.objective && <Field label="Objective" value={exp.objective} />}
                    {exp.setup && <Field label="Setup" value={exp.setup} />}
                    {exp.variables && <Field label="Variables" value={exp.variables} />}
                    {exp.expectedResult && <Field label="Expected Result" value={exp.expectedResult} />}
                    {exp.actualResult && <Field label="Actual Result" value={exp.actualResult} />}
                    {exp.conclusion && <Field label="Conclusion" value={exp.conclusion} />}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => remove(exp.id)}
                        className="flex items-center gap-1 text-[12px] text-muted hover:text-critical"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Experiment" width={560}>
        <div className="max-h-[65vh] space-y-3.5 overflow-y-auto pr-1">
          <div>
            <Label>Experiment name</Label>
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Beam-interrupt detection latency test"
            />
          </div>
          <div>
            <Label>Hypothesis</Label>
            <Textarea
              value={form.hypothesis}
              onChange={(e) => setForm({ ...form, hypothesis: e.target.value })}
            />
          </div>
          <div>
            <Label>Setup</Label>
            <Textarea
              value={form.setup}
              onChange={(e) => setForm({ ...form, setup: e.target.value })}
            />
          </div>
          <div>
            <Label>Variables</Label>
            <Textarea
              value={form.variables}
              onChange={(e) => setForm({ ...form, variables: e.target.value })}
            />
          </div>
          <div>
            <Label>Expected result</Label>
            <Textarea
              value={form.expectedResult}
              onChange={(e) => setForm({ ...form, expectedResult: e.target.value })}
            />
          </div>
          <div>
            <Label>Actual result</Label>
            <Textarea
              value={form.actualResult}
              onChange={(e) => setForm({ ...form, actualResult: e.target.value })}
            />
          </div>
          <div>
            <Label>Conclusion</Label>
            <Textarea
              value={form.conclusion}
              onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim()} loading={saving}>
              Log experiment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="text-ink">{value}</p>
    </div>
  );
}
