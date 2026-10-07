"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

const pad = (n: number) => String(n).padStart(2, "0");
// Local calendar day as YYYY-MM-DD (what the date pickers use).
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function presets() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  return [
    { label: "This month", from: ymd(monthStart), to: ymd(now) },
    { label: "Last month", from: ymd(lastMonthStart), to: ymd(lastMonthEnd) },
    { label: "Last 7 days", from: ymd(weekStart), to: ymd(now) },
  ];
}

// Says what actually went wrong instead of one generic message for everything.
async function describeFailure(res: Response): Promise<string> {
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    const data = await res.json().catch(() => null);
    if (data?.error) return data.error;
  }
  if (res.status >= 500) {
    return `Server error (HTTP ${res.status}). Check the Hostinger runtime logs for details.`;
  }
  return `The request was blocked or failed (HTTP ${res.status}) before it reached the app.`;
}

export function GenerateReportButton() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() => presets()[0].from);
  const [to, setTo] = useState(() => presets()[0].to);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/generate?from=${from}&to=${to}`);
      if (!res.ok) {
        toast(await describeFailure(res), "error");
        return;
      }
      const disposition = res.headers.get("content-disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `Work_Report_${from}_to_${to}.docx`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
      toast("Report downloaded");
    } catch {
      toast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <FileDown size={14} /> Generate Report
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Generate Report" width={400}>
        <div className="space-y-3.5">
          <p className="text-[12px] text-muted">
            Pick a period and get a Word report: an overview, one section per project, upcoming
            deadlines, the daily log (public updates only), and a summary. You can edit it in Word before sending.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presets().map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setFrom(p.from);
                  setTo(p.to);
                }}
                className="rounded-[5px] border border-line px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:text-ink"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from} max={ymd(new Date())} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={generate} loading={loading} disabled={loading || !from || !to}>
              Generate report
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}