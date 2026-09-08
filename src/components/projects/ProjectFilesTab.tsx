"use client";

import { useState } from "react";
import { Plus, Trash2, Files, Code2, FileSpreadsheet, HardDrive, Video, PenTool, Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

type LinkType = "google_sheet" | "google_drive" | "github" | "figma" | "youtube" | "other";

type LinkItem = {
  id: string;
  label: string;
  url: string;
  type: LinkType;
};

const TYPE_META: Record<LinkType, { label: string; icon: typeof Link2 }> = {
  google_sheet: { label: "Google Sheet", icon: FileSpreadsheet },
  google_drive: { label: "Google Drive", icon: HardDrive },
  github: { label: "GitHub", icon: Code2 },
  figma: { label: "Figma", icon: PenTool },
  youtube: { label: "YouTube", icon: Video },
  other: { label: "Other", icon: Link2 },
};

const emptyForm = { label: "", url: "", type: "other" as LinkType };

export function ProjectFilesTab({
  projectId,
  initialLinks,
}: {
  projectId: string;
  initialLinks: LinkItem[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<LinkItem[]>(initialLinks);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.label.trim() || !form.url.trim()) return;
    setSaving(true);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...form }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't add that link. Check the URL and try again.", "error");
      return;
    }
    const data = await res.json();
    setItems((prev) => [data.link, ...prev]);
    setModalOpen(false);
    setForm(emptyForm);
    toast("Link added");
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    toast("Link removed");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted">
          Link out to Drive, GitHub, Figma, or any external resource for this project.
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Add Link
        </Button>
      </div>

      <Card>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Files size={20} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No files or links yet</p>
            <p className="text-[13px] text-muted">Add a Drive folder, GitHub repo, or any external URL.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {items.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas"
                >
                  <Icon size={16} className="shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{item.label}</p>
                    <p className="truncate text-[12px] text-muted">{item.url}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted">{meta.label}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      remove(item.id);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-muted hover:bg-surface hover:text-critical"
                  >
                    <Trash2 size={14} />
                  </button>
                </a>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Link" width={440}>
        <div className="space-y-3.5">
          <div>
            <Label>Label</Label>
            <Input
              autoFocus
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Firmware repo"
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as LinkType })}
            >
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.label.trim() || !form.url.trim()} loading={saving}>
              Add link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
