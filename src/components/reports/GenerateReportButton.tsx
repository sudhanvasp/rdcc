"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function GenerateReportButton() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(isoDate(new Date()));
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch(`/api/reports/generate?from=${from}&to=${to}`);
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error ?? "Couldn't generate that report.", "error");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${from}-to-${to}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
    toast("Report downloaded");
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <FileDown size={14} /> Generate Report
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Generate Report" width={380}>
        <div className="space-y-3.5">
          <p className="text-[12px] text-muted">
            Pick a date range and get a PDF report for that period — useful for records
            outside the automatic weekly one.
          </p>
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from} max={isoDate(new Date())} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={generate} loading={loading} disabled={loading}>
              Generate PDF
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
