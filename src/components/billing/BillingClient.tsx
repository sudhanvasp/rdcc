"use client";

import { useMemo, useState } from "react";
import { Plus, CreditCard, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate, daysUntil } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly" | "one_time";

type Subscription = {
  id: string;
  name: string;
  category: string | null;
  cost: number;
  billingCycle: BillingCycle;
  renewalDate: string | Date | null;
  vendor: string | null;
  notes: string | null;
};

const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "/month",
  yearly: "/year",
  one_time: "one-time",
};

const emptyForm = {
  name: "",
  category: "",
  cost: "",
  billingCycle: "monthly" as BillingCycle,
  renewalDate: "",
  vendor: "",
  notes: "",
};

function money(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function BillingClient({ initialSubscriptions }: { initialSubscriptions: Subscription[] }) {
  const toast = useToast();
  const [items, setItems] = useState<Subscription[]>(initialSubscriptions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const monthly = items.filter((i) => i.billingCycle === "monthly").reduce((s, i) => s + i.cost, 0);
    const yearly = items.filter((i) => i.billingCycle === "yearly").reduce((s, i) => s + i.cost, 0);
    const oneTime = items.filter((i) => i.billingCycle === "one_time").reduce((s, i) => s + i.cost, 0);
    const monthlyTotal = monthly + yearly / 12;
    const yearlyTotal = monthly * 12 + yearly;
    const upcoming = items.filter((i) => {
      if (!i.renewalDate) return false;
      const d = daysUntil(i.renewalDate);
      return d !== null && d >= 0 && d <= 14;
    });
    return { monthlyTotal, yearlyTotal, oneTime, upcoming };
  }, [items]);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(s: Subscription) {
    setForm({
      name: s.name,
      category: s.category ?? "",
      cost: s.cost.toString(),
      billingCycle: s.billingCycle,
      renewalDate: s.renewalDate ? new Date(s.renewalDate).toISOString().slice(0, 10) : "",
      vendor: s.vendor ?? "",
      notes: s.notes ?? "",
    });
    setEditingId(s.id);
    setModalOpen(true);
  }

  async function submit() {
    if (!form.name.trim() || !form.cost) return;
    setSaving(true);
    const payload = {
      name: form.name,
      category: form.category || undefined,
      cost: Number(form.cost) || 0,
      billingCycle: form.billingCycle,
      renewalDate: form.billingCycle === "one_time" ? null : form.renewalDate || undefined,
      vendor: form.vendor || undefined,
      notes: form.notes || undefined,
    };
    const res = await fetch(editingId ? `/api/subscriptions/${editingId}` : "/api/subscriptions", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't save that. Try again.", "error");
      return;
    }
    const data = await res.json();
    const saved = data.subscription;
    setItems((prev) => (editingId ? prev.map((i) => (i.id === editingId ? saved : i)) : [saved, ...prev]));
    setModalOpen(false);
    toast(editingId ? "Updated" : "Added");
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    toast("Removed");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-[20px] font-semibold text-ink">{money(stats.monthlyTotal)}</p>
          <p className="mt-0.5 text-[12px] text-muted">Recurring / month</p>
        </Card>
        <Card className="p-4">
          <p className="text-[20px] font-semibold text-ink">{money(stats.yearlyTotal)}</p>
          <p className="mt-0.5 text-[12px] text-muted">Recurring / year</p>
        </Card>
        <Card className="p-4">
          <p className="text-[20px] font-semibold text-ink">{money(stats.oneTime)}</p>
          <p className="mt-0.5 text-[12px] text-muted">One-time purchases</p>
        </Card>
        <Card className="p-4">
          <p className="text-[20px] font-semibold text-ink">{stats.upcoming.length}</p>
          <p className="mt-0.5 text-[12px] text-muted">Renewing in 14 days</p>
        </Card>
      </div>

      {stats.upcoming.length > 0 && (
        <Card className="border-warning/30 bg-warning-soft p-3.5">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-warning" />
            <div className="text-[13px] text-ink">
              <span className="font-medium">Renewing soon: </span>
              {stats.upcoming.map((s) => s.name).join(", ")}
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Add Subscription
        </Button>
      </div>

      <Card>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <CreditCard size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">Nothing logged yet</p>
            <p className="text-[13px] text-muted">Add the software and tools you&rsquo;ve already bought.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {items.map((s) => {
              const daysLeft = s.renewalDate ? daysUntil(s.renewalDate) : null;
              const soon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
              const overdue = daysLeft !== null && daysLeft < 0;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-ink">{s.name}</span>
                      {s.category && <Badge>{s.category}</Badge>}
                    </div>
                    <p className="text-[12px] text-muted">
                      {money(s.cost)} {CYCLE_LABEL[s.billingCycle]}
                      {s.vendor && ` · ${s.vendor}`}
                    </p>
                  </div>
                  {s.renewalDate && (
                    <span className={`text-[12px] ${overdue ? "text-critical" : soon ? "text-warning" : "text-muted"}`}>
                      Renews {formatDate(s.renewalDate)}
                    </span>
                  )}
                  <button onClick={() => openEdit(s)} className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-critical">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Subscription" : "Add Subscription"} width={460}>
        <div className="space-y-3.5">
          <div>
            <Label>Name</Label>
            <Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Figma, GitHub Copilot" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cost (₹)</Label>
              <Input type="number" min={0} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div>
              <Label>Billing cycle</Label>
              <Select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value as BillingCycle })}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-time</option>
              </Select>
            </div>
          </div>
          {form.billingCycle !== "one_time" && (
            <div>
              <Label>Next renewal date</Label>
              <Input type="date" value={form.renewalDate} onChange={(e) => setForm({ ...form, renewalDate: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Design, Hosting..." />
            </div>
            <div>
              <Label>Vendor</Label>
              <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim() || !form.cost} loading={saving}>
              {editingId ? "Save changes" : "Add subscription"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
