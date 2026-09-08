"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Sparkles, MessageCircle, Shield, Mail } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { PendingDigestsPanel } from "./PendingDigestsPanel";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
];

export function SettingsClient({
  workspace,
  isAdmin,
  status,
}: {
  workspace: { name: string; timezone: string };
  isAdmin: boolean;
  status: { aiProvider: string; aiConfigured: boolean; whatsappConfigured: boolean; emailConfigured: boolean };
}) {
  const toast = useToast();
  const [name, setName] = useState(workspace.name);
  const [timezone, setTimezone] = useState(workspace.timezone);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, timezone }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Couldn't save settings. Try again.", "error");
      return;
    }
    toast("Settings saved");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader title="Workspace" />
        <div className="space-y-3.5 p-4">
          <div>
            <Label>Workspace name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Timezone</Label>
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={!isAdmin}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </Select>
          </div>
          {isAdmin ? (
            <div className="flex justify-end pt-1">
              <Button onClick={save} loading={saving} disabled={saving || !name.trim()}>
                Save changes
              </Button>
            </div>
          ) : (
            <p className="text-[12px] text-muted">Only an admin can change workspace settings.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Connections" />
        <div className="divide-y divide-line">
          <div className="flex items-center gap-3 px-4 py-3">
            <Sparkles size={16} className="text-muted" />
            <div className="flex-1">
              <p className="text-[13px] text-ink">AI Assistant</p>
              <p className="text-[12px] capitalize text-muted">Provider: {status.aiProvider}</p>
            </div>
            {status.aiConfigured ? (
              <span className="flex items-center gap-1 text-[12px] text-success">
                <CheckCircle2 size={13} /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[12px] text-critical">
                <XCircle size={13} /> Not configured
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <MessageCircle size={16} className="text-muted" />
            <div className="flex-1">
              <p className="text-[13px] text-ink">WhatsApp</p>
              <p className="text-[12px] text-muted">Idea capture via WhatsApp bot</p>
            </div>
            {status.whatsappConfigured ? (
              <span className="flex items-center gap-1 text-[12px] text-success">
                <CheckCircle2 size={13} /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[12px] text-critical">
                <XCircle size={13} /> Not configured
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail size={16} className="text-muted" />
            <div className="flex-1">
              <p className="text-[13px] text-ink">Email digests</p>
              <p className="text-[12px] text-muted">Once-a-day pending items summary</p>
            </div>
            {status.emailConfigured ? (
              <span className="flex items-center gap-1 text-[12px] text-success">
                <CheckCircle2 size={13} /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[12px] text-critical">
                <XCircle size={13} /> Not configured
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Security" />
        <div className="space-y-2 p-4 text-[13px] text-muted">
          <p className="flex items-start gap-2">
            <Shield size={14} className="mt-0.5 shrink-0" />
            Passwords are hashed (bcrypt), sessions are signed JWTs in HTTP-only cookies.
          </p>
          <p className="pl-6">
            To add a team member or change roles, go to the Team page. To rotate your session
            secret, update SESSION_SECRET in .env and restart the app (this logs everyone out).
          </p>
        </div>
      </Card>

      {isAdmin && <PendingDigestsPanel />}
    </div>
  );
}
