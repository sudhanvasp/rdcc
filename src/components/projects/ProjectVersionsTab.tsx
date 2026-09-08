"use client";

import { useState } from "react";
import { Plus, Trash2, GitBranch, Code2, Copy, Download, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Textarea, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type Version = {
  id: string;
  label: string;
  changes: string | null;
  code: string | null;
  language: string | null;
  createdAt: string | Date;
};

const LANGUAGES = [
  "javascript", "typescript", "python", "java", "csharp", "cpp", "c", "swift",
  "kotlin", "go", "rust", "arduino", "html", "css", "sql", "json", "yaml", "other",
];

const EXTENSIONS: Record<string, string> = {
  javascript: "js", typescript: "ts", python: "py", java: "java", csharp: "cs",
  cpp: "cpp", c: "c", swift: "swift", kotlin: "kt", go: "go", rust: "rs",
  arduino: "ino", html: "html", css: "css", sql: "sql", json: "json", yaml: "yml", other: "txt",
};

const emptyForm = { label: "", changes: "", code: "", language: "javascript" };

export function ProjectVersionsTab({
  projectId,
  initialVersions,
}: {
  projectId: string;
  initialVersions: Version[];
}) {
  const toast = useToast();
  const [versions, setVersions] = useState<Version[]>(initialVersions);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function submit() {
    if (!form.label.trim()) return;
    setSaving(true);
    const res = await fetch("/api/project-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        label: form.label,
        changes: form.changes || undefined,
        code: form.code || undefined,
        language: form.code ? form.language : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't log that version. Try again.", "error");
      return;
    }
    const data = await res.json();
    setVersions((prev) => [data.version, ...prev]);
    setModalOpen(false);
    setForm(emptyForm);
    toast("Version logged");
  }

  async function remove(id: string) {
    setVersions((prev) => prev.filter((v) => v.id !== id));
    await fetch(`/api/project-versions/${id}`, { method: "DELETE" });
  }

  async function copyCode(v: Version) {
    if (!v.code) return;
    await navigator.clipboard.writeText(v.code);
    setCopiedId(v.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function downloadCode(v: Version) {
    if (!v.code) return;
    const ext = EXTENSIONS[v.language ?? "other"] ?? "txt";
    const blob = new Blob([v.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${v.label.replace(/[^a-z0-9.]+/gi, "-")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted">
        Log a version and optionally attach code — a collaborator can view, copy, or download
        whatever you paste here, like a lightweight shared snippet history.
      </p>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Log Version
        </Button>
      </div>

      {versions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <GitBranch size={20} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No versions logged yet</p>
            <p className="text-[13px] text-muted">Track V0.1, V0.2... as this build evolves.</p>
          </div>
        </Card>
      ) : (
        <div className="relative space-y-0 border-l border-line pl-4">
          {versions.map((v) => {
            const isExpanded = expandedId === v.id;
            return (
              <div key={v.id} className="relative pb-5">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-signal bg-surface" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink">{v.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">{formatDate(v.createdAt)}</span>
                    <button onClick={() => remove(v.id)} className="text-muted hover:text-critical">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {v.changes && <p className="mt-1 text-[12.5px] text-muted">{v.changes}</p>}

                {v.code && (
                  <div className="mt-2 rounded-md border border-line bg-canvas">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : v.id)}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left"
                    >
                      <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                        <Code2 size={12} /> {v.language ?? "code"}
                      </span>
                      {isExpanded ? <ChevronUp size={13} className="text-muted" /> : <ChevronDown size={13} className="text-muted" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-line">
                        <pre className="max-h-72 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed text-ink">
                          {v.code}
                        </pre>
                        <div className="flex justify-end gap-1 border-t border-line px-2 py-1.5">
                          <button
                            onClick={() => copyCode(v)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] text-muted hover:bg-surface hover:text-ink"
                          >
                            {copiedId === v.id ? <Check size={12} /> : <Copy size={12} />}
                            {copiedId === v.id ? "Copied" : "Copy"}
                          </button>
                          <button
                            onClick={() => downloadCode(v)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] text-muted hover:bg-surface hover:text-ink"
                          >
                            <Download size={12} /> Download
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Version" width={520}>
        <div className="max-h-[70vh] space-y-3.5 overflow-y-auto pr-1">
          <div>
            <Label>Version label</Label>
            <Input
              autoFocus
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. V0.2"
            />
          </div>
          <div>
            <Label>What changed</Label>
            <Textarea value={form.changes} onChange={(e) => setForm({ ...form, changes: e.target.value })} />
          </div>
          <div>
            <Label>Code (optional)</Label>
            <Textarea
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Paste code here for a collaborator to retrieve"
              className="min-h-[160px] font-mono text-[12.5px]"
            />
          </div>
          {form.code && (
            <div>
              <Label>Language</Label>
              <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.label.trim()} loading={saving}>
              Log version
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
