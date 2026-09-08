"use client";

import { useEffect, useState } from "react";
import { Send, X, Mail, Eye } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type Digest = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  html: string;
  summary: string;
  createdAt: string;
};

export function PendingDigestsPanel() {
  const toast = useToast();
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Digest | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/digests");
    if (res.ok) {
      const data = await res.json();
      setDigests(data.digests);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function send(id: string) {
    setActingId(id);
    const res = await fetch(`/api/digests/${id}/send`, { method: "POST" });
    setActingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error ?? "Couldn't send that digest.", "error");
      return;
    }
    setDigests((prev) => prev.filter((d) => d.id !== id));
    setPreview(null);
    toast("Digest sent");
  }

  async function dismiss(id: string) {
    setActingId(id);
    await fetch(`/api/digests/${id}`, { method: "DELETE" });
    setActingId(null);
    setDigests((prev) => prev.filter((d) => d.id !== id));
    setPreview(null);
    toast("Dismissed — won't ask again for a while");
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader
        title={`Pending Digests${digests.length > 0 ? ` (${digests.length})` : ""}`}
      />
      {digests.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted">
          Nothing waiting for review right now.
        </p>
      ) : (
        <div className="divide-y divide-line">
          {digests.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-4 py-3">
              <Mail size={16} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">{d.recipientName}</p>
                <p className="truncate text-[12px] text-muted">{d.summary}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted">{formatDate(d.createdAt)}</span>
              <button
                onClick={() => setPreview(d)}
                className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => dismiss(d.id)}
                disabled={actingId === d.id}
                className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-critical disabled:opacity-40"
              >
                <X size={14} />
              </button>
              <Button size="sm" onClick={() => send(d.id)} loading={actingId === d.id} disabled={actingId === d.id}>
                <Send size={13} /> Send
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.subject ?? ""} width={520}>
        {preview && (
          <div className="space-y-3">
            <p className="text-[12px] text-muted">
              To: {preview.recipientName} &lt;{preview.recipientEmail}&gt;
            </p>
            {/* Deliberately hard-coded to a white background, not the app's
                theme variables — the email HTML itself assumes a white
                background (that's what the recipient will actually see), so
                previewing it on the app's dark theme made it unreadable. */}
            <div
              className="rounded-md border border-line bg-white p-4 text-[13px] text-black"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => dismiss(preview.id)}>
                <X size={13} /> Dismiss
              </Button>
              <Button onClick={() => send(preview.id)} loading={actingId === preview.id}>
                <Send size={13} /> Send this
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
