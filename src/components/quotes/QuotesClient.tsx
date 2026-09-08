"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type QuoteStatus = "draft" | "sent" | "won" | "lost";

type Quote = {
  id: string;
  title: string;
  clientName: string | null;
  status: QuoteStatus;
  convertedProjectId: string | null;
  updatedAt: string | Date;
  totalCost: number;
  itemCount: number;
};

const STATUS_META: Record<QuoteStatus, { label: string; soft: string; text: string }> = {
  draft: { label: "Draft", soft: "bg-neutral-soft", text: "text-neutral" },
  sent: { label: "Sent", soft: "bg-warning-soft", text: "text-warning" },
  won: { label: "Won", soft: "bg-success-soft", text: "text-success" },
  lost: { label: "Lost", soft: "bg-critical-soft", text: "text-critical" },
};

const emptyForm = { title: "", clientName: "" };

export function QuotesClient({ initialQuotes }: { initialQuotes: Quote[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Quote[]>(initialQuotes);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, clientName: form.clientName || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't create that BOM. Try again.", "error");
      return;
    }
    const data = await res.json();
    router.push(`/bom/${data.quote.id}`);
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.preventDefault();
    setItems((prev) => prev.filter((q) => q.id !== id));
    await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    toast("BOM deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">
          Cost estimates you send to enquiries — separate from Inventory and independent of any project.
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> New BOM
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <FileText size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No BOMs yet</p>
            <p className="text-[13px] text-muted">Draft one the next time an enquiry comes in.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((q) => {
            const sm = STATUS_META[q.status];
            return (
              <Link key={q.id} href={`/bom/${q.id}`}>
                <Card className="h-full p-4 transition-colors hover:border-signal/40">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <h3 className="truncate text-[13px] font-medium text-ink">{q.title}</h3>
                    <button
                      onClick={(e) => remove(q.id, e)}
                      className="shrink-0 rounded p-1 text-muted hover:text-critical"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {q.clientName && <p className="mb-2 text-[12px] text-muted">{q.clientName}</p>}
                  <div className="mb-2 flex items-center gap-2">
                    <Badge soft={sm.soft} text={sm.text}>{sm.label}</Badge>
                    <span className="text-[12px] text-muted">{q.itemCount} items</span>
                  </div>
                  <p className="text-[15px] font-semibold text-ink">
                    ₹{q.totalCost.toLocaleString("en-IN")}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">Updated {formatDate(q.updatedAt)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New BOM" width={420}>
        <div className="space-y-3.5">
          <div>
            <Label>Title</Label>
            <Input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Drone show enquiry — Acme Corp"
            />
          </div>
          <div>
            <Label>Client name (optional)</Label>
            <Input
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title.trim()} loading={saving}>
              Create BOM
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
