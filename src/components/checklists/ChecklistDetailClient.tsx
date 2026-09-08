"use client";

import { useState, KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Package, Undo2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type ChecklistItem = {
  id: string;
  name: string;
  packed: boolean;
  returned: boolean;
};

type Checklist = {
  id: string;
  title: string;
  eventDate: string | Date | null;
};

export function ChecklistDetailClient({
  checklist,
  initialItems,
}: {
  checklist: Checklist;
  initialItems: ChecklistItem[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  const packedCount = items.filter((i) => i.packed).length;
  const returnedCount = items.filter((i) => i.returned).length;
  const allPacked = items.length > 0 && packedCount === items.length;

  async function addItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    const res = await fetch("/api/checklist-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistId: checklist.id, name: newItem }),
    });
    setAdding(false);
    if (!res.ok) {
      toast("Couldn't add that item. Try again.", "error");
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
    setNewItem("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addItem();
  }

  async function toggle(id: string, field: "packed" | "returned", value: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    await fetch(`/api/checklist-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/checklist-items/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-4">
      <Link href="/checklists" className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft size={14} /> Checklists
      </Link>

      <div>
        <h1 className="text-[18px] font-semibold text-ink">{checklist.title}</h1>
        {checklist.eventDate && (
          <p className="mt-0.5 text-[13px] text-muted">{formatDate(checklist.eventDate)}</p>
        )}
      </div>

      <div className="flex gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <Package size={13} /> {packedCount}/{items.length} packed
        </span>
        {allPacked && (
          <span className="flex items-center gap-1.5">
            <Undo2 size={13} /> {returnedCount}/{items.length} returned
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add an item and press Enter (e.g. Raspberry Pi 5)"
        />
      </div>

      <Card>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            Nothing on this list yet. Add what you&rsquo;re taking above.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`flex-1 text-[13px] ${item.packed ? "text-ink" : "text-ink"}`}>
                  {item.name}
                </span>
                <label className="flex items-center gap-1.5 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    checked={item.packed}
                    onChange={(e) => toggle(item.id, "packed", e.target.checked)}
                    className="h-4 w-4 rounded accent-signal"
                  />
                  Packed
                </label>
                <label className="flex items-center gap-1.5 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    checked={item.returned}
                    disabled={!item.packed}
                    onChange={(e) => toggle(item.id, "returned", e.target.checked)}
                    className="h-4 w-4 rounded accent-success disabled:opacity-30"
                  />
                  Returned
                </label>
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
    </div>
  );
}
