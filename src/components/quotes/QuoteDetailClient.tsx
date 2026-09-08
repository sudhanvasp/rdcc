"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ArrowRightCircle, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ExportMenu } from "@/components/ui/ExportMenu";

type QuoteStatus = "draft" | "sent" | "won" | "lost";

type QuoteItem = {
  id: string;
  partName: string;
  quantity: number;
  unitCost: number;
};

type Quote = {
  id: string;
  title: string;
  clientName: string | null;
  status: QuoteStatus;
  convertedProjectId: string | null;
};

const STATUS_OPTIONS: { value: QuoteStatus; label: string; soft: string; text: string }[] = [
  { value: "draft", label: "Draft", soft: "bg-neutral-soft", text: "text-neutral" },
  { value: "sent", label: "Sent", soft: "bg-warning-soft", text: "text-warning" },
  { value: "won", label: "Won", soft: "bg-success-soft", text: "text-success" },
  { value: "lost", label: "Lost", soft: "bg-critical-soft", text: "text-critical" },
];

function money(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export function QuoteDetailClient({
  quote,
  initialItems,
}: {
  quote: Quote;
  initialItems: QuoteItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(quote.title);
  const [clientName, setClientName] = useState(quote.clientName ?? "");
  const [status, setStatus] = useState<QuoteStatus>(quote.status);
  const [items, setItems] = useState<QuoteItem[]>(initialItems);
  const [converting, setConverting] = useState(false);
  const lastRowRef = useRef<HTMLInputElement>(null);

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const statusMeta = STATUS_OPTIONS.find((s) => s.value === status)!;

  async function saveQuoteField(fields: Record<string, unknown>) {
    await fetch(`/api/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  }

  async function addRow() {
    const res = await fetch("/api/quote-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: quote.id, order: items.length }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
    requestAnimationFrame(() => lastRowRef.current?.focus());
  }

  function updateLocal(id: string, fields: Partial<QuoteItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...fields } : i)));
  }

  async function saveRow(id: string, fields: Record<string, unknown>) {
    await fetch(`/api/quote-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  }

  async function removeRow(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/quote-items/${id}`, { method: "DELETE" });
  }

  async function convert() {
    setConverting(true);
    const res = await fetch(`/api/quotes/${quote.id}/convert`, { method: "POST" });
    setConverting(false);
    if (!res.ok) {
      toast("Couldn't convert this BOM. Try again.", "error");
      return;
    }
    const data = await res.json();
    toast("Converted to project");
    router.push(`/projects/${data.project.id}`);
  }

  async function removeQuote() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
    router.push("/bom");
  }

  return (
    <div className="space-y-4">
      <Link href="/bom" className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft size={14} /> BOMs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveQuoteField({ title })}
            className="w-full max-w-md bg-transparent text-[18px] font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-signal/40 rounded"
          />
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            onBlur={() => saveQuoteField({ clientName: clientName || null })}
            placeholder="Client name"
            className="block bg-transparent text-[13px] text-muted focus:outline-none focus:ring-1 focus:ring-signal/40 rounded"
          />
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu baseUrl={`/api/quotes/${quote.id}/export`} />
          <select
            value={status}
            onChange={(e) => {
              const v = e.target.value as QuoteStatus;
              setStatus(v);
              saveQuoteField({ status: v });
            }}
            className={`rounded-[5px] border-0 px-2.5 py-1 text-[12px] font-medium ${statusMeta.soft} ${statusMeta.text}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={removeQuote}
            className="rounded-md p-2 text-muted hover:bg-critical-soft hover:text-critical"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {quote.convertedProjectId ? (
        <Link
          href={`/projects/${quote.convertedProjectId}`}
          className="flex w-fit items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] text-signal hover:bg-canvas"
        >
          <ExternalLink size={13} /> Converted to project — open it
        </Link>
      ) : (
        <Button size="sm" variant="secondary" onClick={convert} loading={converting} disabled={items.length === 0}>
          <ArrowRightCircle size={14} /> Client approved — convert to project
        </Button>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-[11px] font-medium uppercase tracking-wide text-muted">
              <th className="w-10 px-3 py-2">#</th>
              <th className="px-3 py-2">Part Name</th>
              <th className="w-24 px-3 py-2 text-right">Qty</th>
              <th className="w-32 px-3 py-2 text-right">Unit Cost</th>
              <th className="w-32 px-3 py-2 text-right">Total Cost</th>
              <th className="w-8 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b border-line last:border-b-0 hover:bg-canvas">
                <td className="px-3 py-1.5 text-muted">{idx + 1}</td>
                <td className="px-1 py-1">
                  <input
                    ref={idx === items.length - 1 ? lastRowRef : undefined}
                    value={item.partName}
                    onChange={(e) => updateLocal(item.id, { partName: e.target.value })}
                    onBlur={(e) => saveRow(item.id, { partName: e.target.value })}
                    placeholder="e.g. Raspberry Pi 5"
                    className="w-full rounded px-2 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-signal/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateLocal(item.id, { quantity: Number(e.target.value) || 1 })}
                    onBlur={(e) => saveRow(item.id, { quantity: Number(e.target.value) || 1 })}
                    className="w-full rounded px-2 py-1 text-right text-ink focus:outline-none focus:ring-1 focus:ring-signal/40"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="number"
                    min={0}
                    value={item.unitCost}
                    onChange={(e) => updateLocal(item.id, { unitCost: Number(e.target.value) || 0 })}
                    onBlur={(e) => saveRow(item.id, { unitCost: Number(e.target.value) || 0 })}
                    className="w-full rounded px-2 py-1 text-right text-ink focus:outline-none focus:ring-1 focus:ring-signal/40"
                  />
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-ink">
                  {money(item.quantity * item.unitCost)}
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => removeRow(item.id)}
                    className="rounded-md p-1 text-muted hover:text-critical"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-canvas font-medium">
              <td colSpan={4} className="px-3 py-2 text-right text-[12px] text-muted">
                Total Estimated Cost
              </td>
              <td className="px-3 py-2 text-right text-ink">{money(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <div className="border-t border-line p-2">
          <button
            onClick={addRow}
            className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-medium text-muted hover:bg-canvas hover:text-ink"
          >
            <Plus size={13} /> Add Row
          </button>
        </div>
      </Card>
    </div>
  );
}
