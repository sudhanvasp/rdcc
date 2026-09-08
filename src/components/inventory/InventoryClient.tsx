"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Boxes, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

type InventoryItem = {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unitCost: number | null;
  supplier: string | null;
  partNumber: string | null;
  notes: string | null;
};

const emptyForm = {
  name: "",
  category: "",
  quantity: "0",
  unitCost: "",
  supplier: "",
  partNumber: "",
};

export function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () =>
      query.trim()
        ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
        : items,
    [items, query]
  );

  async function submit() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        category: form.category || undefined,
        quantity: Number(form.quantity) || 0,
        unitCost: form.unitCost ? Number(form.unitCost) : null,
        supplier: form.supplier || undefined,
        partNumber: form.partNumber || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't add that item. Try again.", "error");
      return;
    }
    const data = await res.json();
    setItems((prev) => [data.inventoryItem, ...prev]);
    setModalOpen(false);
    setForm(emptyForm);
    toast("Item added to inventory");
  }

  async function updateQuantity(id: string, quantity: number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
    await fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    toast("Item removed");
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        Shared inventory across all projects. Per-project BOMs live inside each project&rsquo;s BOM tab.
      </p>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Do we have an ESP32?"
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Add Item
        </Button>
      </div>

      <Card>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Boxes size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">
              {query ? `Nothing matching "${query}"` : "Inventory is empty"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {visible.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink">{item.name}</p>
                  <p className="text-[12px] text-muted">
                    {item.category ?? "Uncategorized"}
                    {item.supplier && ` · ${item.supplier}`}
                    {item.unitCost != null && ` · ₹${item.unitCost}/unit`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                    className="flex h-6 w-6 items-center justify-center rounded border border-line text-muted hover:text-ink"
                  >
                    &minus;
                  </button>
                  <span className="w-8 text-center text-[13px] text-ink">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="flex h-6 w-6 items-center justify-center rounded border border-line text-muted hover:text-ink"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => remove(item.id)}
                  className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-critical"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Inventory Item" width={440}>
        <div className="space-y-3.5">
          <div>
            <Label>Name</Label>
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. ESP32"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label>Quantity in stock</Label>
              <Input
                type="number"
                min={0}
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
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Part number</Label>
            <Input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim()} loading={saving}>
              Add item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
