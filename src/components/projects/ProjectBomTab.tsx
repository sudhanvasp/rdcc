"use client";

import { useState } from "react";
import { Plus, Trash2, Boxes } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ExportMenu } from "@/components/ui/ExportMenu";

type BomStatus = "available" | "needed" | "ordered" | "arrived";

type BomItem = {
  id: string;
  component: string;
  category: string | null;
  quantity: number;
  unitCost: number | null;
  supplier: string | null;
  partNumber: string | null;
  status: BomStatus;
};

const STATUS_META: Record<BomStatus, { label: string; soft: string; text: string }> = {
  available: { label: "Available", soft: "bg-success-soft", text: "text-success" },
  needed: { label: "Needed", soft: "bg-critical-soft", text: "text-critical" },
  ordered: { label: "Ordered", soft: "bg-warning-soft", text: "text-warning" },
  arrived: { label: "Arrived", soft: "bg-info-soft", text: "text-info" },
};

const emptyForm = {
  component: "",
  category: "",
  quantity: "1",
  unitCost: "",
  supplier: "",
  partNumber: "",
  status: "needed" as BomStatus,
};

function money(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export function ProjectBomTab({
  projectId,
  initialItems,
}: {
  projectId: string;
  initialItems: BomItem[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<BomItem[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const totalCost = items.reduce((sum, i) => sum + (i.unitCost ?? 0) * i.quantity, 0);

  async function submit() {
    if (!form.component.trim()) return;
    setSaving(true);
    const res = await fetch("/api/bom-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        component: form.component,
        category: form.category || undefined,
        quantity: Number(form.quantity) || 1,
        unitCost: form.unitCost ? Number(form.unitCost) : null,
        supplier: form.supplier || undefined,
        partNumber: form.partNumber || undefined,
        status: form.status,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't add that component. Try again.", "error");
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, data.bomItem]);
    setModalOpen(false);
    setForm(emptyForm);
    toast("Component added to BOM");
  }

  async function setStatus(id: string, status: BomStatus) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    await fetch(`/api/bom-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/bom-items/${id}`, { method: "DELETE" });
    toast("Component removed");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5">
          <span className="text-[12px] text-muted">Total Estimated Cost</span>
          <span className="text-[15px] font-semibold text-ink">{money(totalCost)}</span>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu baseUrl={`/api/projects/${projectId}/bom-export`} />
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Add Component
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Boxes size={20} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No BOM items yet</p>
            <p className="text-[13px] text-muted">Add the components this build needs.</p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas text-left text-[11px] font-medium uppercase tracking-wide text-muted">
                <th className="w-10 px-3 py-2">#</th>
                <th className="px-3 py-2">Part Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit Cost</th>
                <th className="px-3 py-2 text-right">Total Cost</th>
                <th className="px-3 py-2">Status</th>
                <th className="w-8 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const sm = STATUS_META[item.status];
                const lineTotal = (item.unitCost ?? 0) * item.quantity;
                return (
                  <tr key={item.id} className="border-b border-line last:border-b-0 hover:bg-canvas">
                    <td className="px-3 py-2 text-muted">{idx + 1}</td>
                    <td className="px-3 py-2 text-ink">
                      {item.component}
                      {item.partNumber && (
                        <span className="ml-1.5 font-mono text-[11px] text-muted">#{item.partNumber}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">{item.category ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-ink">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-muted">
                      {item.unitCost != null ? money(item.unitCost) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-ink">
                      {item.unitCost != null ? money(lineTotal) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.status}
                        onChange={(e) => setStatus(item.id, e.target.value as BomStatus)}
                        className={`rounded-[5px] border-0 px-2 py-0.5 text-[12px] font-medium ${sm.soft} ${sm.text}`}
                      >
                        {Object.entries(STATUS_META).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => remove(item.id)}
                        className="rounded-md p-1 text-muted hover:text-critical"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-canvas font-medium">
                <td colSpan={5} className="px-3 py-2 text-right text-[12px] text-muted">
                  Total Estimated Cost
                </td>
                <td className="px-3 py-2 text-right text-ink">{money(totalCost)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add BOM Component" width={460}>
        <div className="space-y-3.5">
          <div>
            <Label>Component</Label>
            <Input
              autoFocus
              value={form.component}
              onChange={(e) => setForm({ ...form, component: e.target.value })}
              placeholder="e.g. ESP32"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Electronics"
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit cost (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BomStatus })}
              >
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier</Label>
              <Input
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>
            <div>
              <Label>Part number</Label>
              <Input
                value={form.partNumber}
                onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.component.trim()} loading={saving}>
              Add component
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
