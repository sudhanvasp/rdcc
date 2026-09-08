"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ClipboardCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type Checklist = {
  id: string;
  title: string;
  eventDate: string | Date | null;
  createdAt: string | Date;
  totalItems: number;
  packedItems: number;
  returnedItems: number;
};

const emptyForm = { title: "", eventDate: "" };

export function ChecklistsClient({ initialChecklists }: { initialChecklists: Checklist[] }) {
  const toast = useToast();
  const [items, setItems] = useState<Checklist[]>(initialChecklists);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, eventDate: form.eventDate || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't create that checklist. Try again.", "error");
      return;
    }
    const data = await res.json();
    setItems((prev) => [{ ...data.checklist, totalItems: 0, packedItems: 0, returnedItems: 0 }, ...prev]);
    setModalOpen(false);
    setForm(emptyForm);
    toast("Checklist created");
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.preventDefault();
    setItems((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/checklists/${id}`, { method: "DELETE" });
    toast("Checklist deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">
          Pack before you leave, tick off as things come back after the event.
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> New Checklist
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ClipboardCheck size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No checklists yet</p>
            <p className="text-[13px] text-muted">Create one before your next event.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Link key={c.id} href={`/checklists/${c.id}`}>
              <Card className="h-full p-4 transition-colors hover:border-signal/40">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-medium text-ink">{c.title}</h3>
                  <button
                    onClick={(e) => remove(c.id, e)}
                    className="shrink-0 rounded p-1 text-muted hover:text-critical"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {c.eventDate && <p className="mb-2 text-[12px] text-muted">{formatDate(c.eventDate)}</p>}
                <p className="mb-1 text-[12px] text-muted">
                  {c.packedItems}/{c.totalItems} packed
                  {c.packedItems === c.totalItems && c.totalItems > 0 && " · " + c.returnedItems + "/" + c.totalItems + " returned"}
                </p>
                <ProgressBar
                  value={c.totalItems ? (c.packedItems / c.totalItems) * 100 : 0}
                  barClassName="bg-success"
                />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Checklist" width={420}>
        <div className="space-y-3.5">
          <div>
            <Label>Title</Label>
            <Input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. TechFest demo day"
            />
          </div>
          <div>
            <Label>Event date (optional)</Label>
            <Input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title.trim()} loading={saving}>
              Create checklist
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
