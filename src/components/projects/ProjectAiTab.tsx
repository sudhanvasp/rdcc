"use client";

import { useState } from "react";
import { Sparkles, FileText, ListOrdered, AlertTriangle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Action = "summarize" | "next_steps" | "risks";

const ACTIONS: { id: Action; label: string; icon: typeof FileText }[] = [
  { id: "summarize", label: "Summarize project", icon: FileText },
  { id: "next_steps", label: "Suggest next steps", icon: ListOrdered },
  { id: "risks", label: "Identify risks", icon: AlertTriangle },
];

export function ProjectAiTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ action: Action; text: string } | null>(null);

  async function run(action: Action) {
    setLoading(action);
    setError(null);
    setResult(null);
    const res = await fetch("/api/ai/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, action }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setResult({ action, text: data.reply });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Button
              key={a.id}
              size="sm"
              variant="secondary"
              onClick={() => run(a.id)}
              loading={loading === a.id}
              disabled={loading !== null}
            >
              <Icon size={13} /> {a.label}
            </Button>
          );
        })}
      </div>

      {error && (
        <Card className="flex items-start gap-2 border-critical/30 bg-critical-soft p-3.5 text-[12.5px] text-critical">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </Card>
      )}

      {result && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            <Sparkles size={12} /> {ACTIONS.find((a) => a.id === result.action)?.label}
          </div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{result.text}</p>
        </Card>
      )}

      {!result && !error && !loading && (
        <p className="py-8 text-center text-[13px] text-muted">
          Pick an action above — answers are generated from this project&rsquo;s actual tasks and status.
        </p>
      )}
    </div>
  );
}
