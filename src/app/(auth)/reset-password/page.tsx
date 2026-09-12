"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (!token) {
    return (
      <div className="w-full max-w-[380px] rounded-md border border-line bg-surface p-6 text-center">
        <p className="text-[13px] text-ink">This link is missing its reset token.</p>
        <Link href="/forgot-password" className="mt-3 inline-block text-[13px] text-signal hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-[380px] rounded-md border border-line bg-surface p-6 text-center">
        <CheckCircle2 size={28} className="mx-auto mb-3 text-success" />
        <h1 className="mb-1 text-[15px] font-semibold text-ink">Password updated</h1>
        <p className="text-[13px] text-muted">Taking you to login...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-signal text-[13px] font-bold text-white">
          R
        </div>
        <h1 className="text-[15px] font-semibold text-ink">Set a new password</h1>
      </div>

      <form onSubmit={onSubmit} className="rounded-md border border-line bg-surface p-5">
        <div className="mb-4">
          <Label>New password</Label>
          <Input
            type="password"
            required
            autoFocus
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <div className="mb-4">
          <Label>Confirm password</Label>
          <Input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p className="mb-4 rounded-md bg-critical-soft px-3 py-2 text-[13px] text-critical">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} loading={loading} className="w-full">
          Update password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}