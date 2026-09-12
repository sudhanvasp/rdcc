"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-[380px] rounded-md border border-line bg-surface p-6 text-center">
          <Mail size={28} className="mx-auto mb-3 text-signal" />
          <h1 className="mb-1 text-[15px] font-semibold text-ink">Check your email</h1>
          <p className="text-[13px] text-muted">
            If that email has an account, a reset link is on its way. It expires in 1 hour.
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
          <h1 className="text-[15px] font-semibold text-ink">Reset your password</h1>
          <p className="text-[13px] text-muted">We'll email you a reset link</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-md border border-line bg-surface p-5">
          <div className="mb-4">
            <Label>Email</Label>
            <Input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} loading={loading} className="w-full">
            Send reset link
          </Button>
        </form>

        <p className="mt-4 text-center text-[12px] text-muted">
          <Link href="/login" className="text-signal hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}