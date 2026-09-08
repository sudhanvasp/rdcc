"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-[380px] rounded-md border border-line bg-surface p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3 text-success" />
          <h1 className="mb-1 text-[15px] font-semibold text-ink">Request sent</h1>
          <p className="text-[13px] text-muted">
            An admin needs to approve your account before you can log in. You&rsquo;ll be able
            to sign in once that happens.
          </p>
          <Link href="/login" className="mt-4 inline-block text-[13px] text-signal hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-signal text-[13px] font-bold text-white">
            R
          </div>
          <h1 className="text-[15px] font-semibold text-ink">Request access</h1>
          <p className="text-[13px] text-muted">An admin will need to approve your account</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-md border border-line bg-surface p-5">
          <div className="mb-4">
            <Label>Name</Label>
            <Input required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-4">
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@team.com"
            />
          </div>
          <div className="mb-4">
            <Label>Password</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="mb-4 rounded-md bg-critical-soft px-3 py-2 text-[13px] text-critical">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} loading={loading} className="w-full">
            Request access
          </Button>
        </form>

        <p className="mt-4 text-center text-[12px] text-muted">
          Already approved?{" "}
          <Link href="/login" className="text-signal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
