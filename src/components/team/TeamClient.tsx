"use client";

import { useState } from "react";
import { Plus, Copy, Check, Pencil, Phone, UserCheck, X, Clock, KeyRound } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Label, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  avatarColor: string;
  skills: string[];
  phone?: string | null;
  openTaskCount: number;
  workload: number;
  projectNames: string[];
};

type PendingUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

const emptyCreateForm = { name: "", email: "", phone: "", password: "", role: "member" as "admin" | "member", skills: "" };
const emptyEditForm = { name: "", email: "", phone: "", role: "member" as "admin" | "member", skills: "" };

export function TeamClient({
  initialMembers,
  initialPending,
  isAdmin,
}: {
  initialMembers: Member[];
  initialPending: PendingUser[];
  isAdmin: boolean;
}) {
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [pending, setPending] = useState<PendingUser[]>(initialPending);
  const [actingId, setActingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; email: string; password: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);

  async function resetPassword(id: string) {
    if (!confirm("Reset this person's password? Their old password will stop working immediately.")) return;
    setResettingId(id);
    const res = await fetch(`/api/team/${id}/reset-password`, { method: "POST" });
    setResettingId(null);
    if (!res.ok) {
      toast("Couldn't reset that password. Try again.", "error");
      return;
    }
    const data = await res.json();
    setResetResult(data);
  }
  const [editSaving, setEditSaving] = useState(false);

  async function submit() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) return;
    setSaving(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role: form.role,
        skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error ?? "Couldn't add that person. Try again.", "error");
      return;
    }
    const data = await res.json();
    setMembers((prev) => [
      ...prev,
      {
        id: data.member.id,
        name: data.member.name,
        email: data.member.email,
        role: data.member.role,
        avatarColor: data.member.avatarColor,
        skills: data.member.skills,
        phone: data.member.phone,
        openTaskCount: 0,
        workload: 0,
        projectNames: [],
      },
    ]);
    setCreated({ name: form.name, email: form.email, password: form.password });
    setModalOpen(false);
    setForm(emptyCreateForm);
  }

  function copyCredentials() {
    if (!created) return;
    navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openEdit(m: Member) {
    setEditForm({ name: m.name, email: m.email, phone: m.phone ?? "", role: m.role, skills: m.skills.join(", ") });
    setEditingId(m.id);
  }

  async function saveEdit() {
    if (!editingId || !editForm.name.trim()) return;
    setEditSaving(true);
    const res = await fetch(`/api/team/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || null,
        role: editForm.role,
        skills: editForm.skills ? editForm.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error ?? "Couldn't save changes. Try again.", "error");
      return;
    }
    const data = await res.json();
    setMembers((prev) =>
      prev.map((m) =>
        m.id === editingId
          ? { ...m, name: data.member.name, email: data.member.email, phone: data.member.phone, role: data.member.role, skills: data.member.skills }
          : m
      )
    );
    setEditingId(null);
    toast("Updated");
  }

  const [pendingRoles, setPendingRoles] = useState<Record<string, "admin" | "member">>({});

  async function approve(id: string) {
    setActingId(id);
    const role = pendingRoles[id] ?? "member";
    const res = await fetch(`/api/team/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setActingId(null);
    if (!res.ok) {
      toast("Couldn't approve that request. Try again.", "error");
      return;
    }
    const data = await res.json();
    const approved = pending.find((p) => p.id === id);
    setPending((prev) => prev.filter((p) => p.id !== id));
    if (approved) {
      setMembers((prev) => [
        ...prev,
        {
          id: data.member.id,
          name: data.member.name,
          email: data.member.email,
          role: data.member.role,
          avatarColor: data.member.avatarColor,
          skills: data.member.skills,
          phone: data.member.phone,
          openTaskCount: 0,
          workload: 0,
          projectNames: [],
        },
      ]);
    }
    toast(`${approved?.name ?? "Member"} approved as ${role}`);
  }

  async function reject(id: string) {
    setActingId(id);
    const res = await fetch(`/api/team/${id}/reject`, { method: "POST" });
    setActingId(null);
    if (!res.ok) {
      toast("Couldn't reject that request. Try again.", "error");
      return;
    }
    setPending((prev) => prev.filter((p) => p.id !== id));
    toast("Request rejected");
  }

  return (
    <div className="space-y-4">
      {isAdmin && pending.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader title={`Pending Approval (${pending.length})`} />
          <div className="divide-y divide-line">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Clock size={16} className="shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink">{p.name}</p>
                  <p className="truncate text-[12px] text-muted">
                    {p.email} · requested {formatDate(p.createdAt)}
                  </p>
                </div>
                <Select
                  value={pendingRoles[p.id] ?? "member"}
                  onChange={(e) =>
                    setPendingRoles((prev) => ({ ...prev, [p.id]: e.target.value as "admin" | "member" }))
                  }
                  className="!h-8 w-28 text-[12.5px]"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </Select>
                <button
                  onClick={() => reject(p.id)}
                  disabled={actingId === p.id}
                  className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-critical disabled:opacity-40"
                >
                  <X size={14} />
                </button>
                <Button size="sm" onClick={() => approve(p.id)} loading={actingId === p.id} disabled={actingId === p.id}>
                  <UserCheck size={13} /> Approve
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Add Team Member
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <Card key={m.id}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={m.name} color={m.avatarColor} size={36} />
                <div>
                  <p className="text-[13px] font-medium text-ink">{m.name}</p>
                  <p className="text-[12px] capitalize text-muted">{m.role}</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => resetPassword(m.id)}
                    disabled={resettingId === m.id}
                    title="Reset password"
                    className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink disabled:opacity-40"
                  >
                    <KeyRound size={14} />
                  </button>
                  <button onClick={() => openEdit(m)} className="rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink">
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  Workload ({m.openTaskCount} open tasks)
                </p>
                <ProgressBar
                  value={m.workload}
                  barClassName={m.workload > 70 ? "bg-critical" : m.workload > 40 ? "bg-warning" : "bg-success"}
                />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.skills.length === 0 && <span className="text-[12px] text-muted">None listed</span>}
                  {m.skills.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                  Active Projects ({m.projectNames.length})
                </p>
                <ul className="space-y-0.5">
                  {m.projectNames.map((name) => (
                    <li key={name} className="truncate text-[12.5px] text-ink">{name}</li>
                  ))}
                  {m.projectNames.length === 0 && (
                    <li className="text-[12px] text-muted">No active projects</li>
                  )}
                </ul>
              </div>
              {m.phone ? (
                <p className="flex items-center gap-1.5 text-[12px] text-muted">
                  <Phone size={12} /> WhatsApp linked
                </p>
              ) : (
                isAdmin && (
                  <p className="flex items-center gap-1.5 text-[12px] text-warning">
                    <Phone size={12} /> No phone — can&rsquo;t use WhatsApp bot yet
                  </p>
                )
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Team Member" width={440}>
        <div className="space-y-3.5">
          <div>
            <Label>Name</Label>
            <Input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Priya"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="priya@team.com"
            />
          </div>
          <div>
            <Label>WhatsApp number (optional)</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="919876543210 (country code, no +)"
            />
            <p className="mt-1 text-[11px] text-muted">Needed for them to use the WhatsApp bot. Can add later.</p>
          </div>
          <div>
            <Label>Initial password</Label>
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
            />
            <p className="mt-1 text-[11px] text-muted">
              You&rsquo;ll share this with them directly — there&rsquo;s no invite email yet.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "member" })}
              >
                <option value="member">Member</option>
                <option value="admin">Admin (e.g. CTO, manager)</option>
              </Select>
            </div>
            <div>
              <Label>Skills</Label>
              <Input
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="Arduino, CAD"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={saving || !form.name.trim() || !form.email.trim() || form.password.length < 6}
              loading={saving}
            >
              Add member
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} title="Team member added" width={420}>
        {created && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink">
              Share these login details with <span className="font-medium">{created.name}</span>:
            </p>
            <div className="rounded-md border border-line bg-canvas p-3 font-mono text-[12.5px] text-ink">
              <p>Email: {created.email}</p>
              <p>Password: {created.password}</p>
            </div>
            <Button variant="secondary" onClick={copyCredentials} className="w-full">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy to clipboard"}
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!resetResult} onClose={() => { setResetResult(null); setResetCopied(false); }} title="Password reset" width={420}>
        {resetResult && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink">
              Share this new password with <span className="font-medium">{resetResult.name}</span> —
              their old password no longer works.
            </p>
            <div className="rounded-md border border-line bg-canvas p-3 font-mono text-[12.5px] text-ink">
              <p>Email: {resetResult.email}</p>
              <p>Password: {resetResult.password}</p>
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(`Email: ${resetResult.email}\nPassword: ${resetResult.password}`);
                setResetCopied(true);
              }}
              className="w-full"
            >
              {resetCopied ? <Check size={14} /> : <Copy size={14} />}
              {resetCopied ? "Copied" : "Copy to clipboard"}
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={!!editingId} onClose={() => setEditingId(null)} title="Edit Team Member" width={420}>
        <div className="space-y-3.5">
          <div>
            <Label>Name</Label>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <Label>Email (login)</Label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>
          <div>
            <Label>WhatsApp number</Label>
            <Input
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="919876543210 (country code, no +)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "admin" | "member" })}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div>
              <Label>Skills</Label>
              <Input value={editForm.skills} onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving || !editForm.name.trim()} loading={editSaving}>
              Save changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
