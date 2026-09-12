import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, isEmailConfigured, EmailConfigError } from "@/lib/email";
import crypto from "crypto";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Deliberately always returns the same generic response whether or not the
// email exists — this prevents someone from using "forgot password" to
// find out which emails have accounts (a real, standard attack pattern).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const genericResponse = NextResponse.json({
    message: "If that email has an account, we've sent a reset link to it.",
  });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);
  if (!user || user.status !== "active") return genericResponse;

  if (!isEmailConfigured()) {
    // Nothing we can do — log it for whoever's running the server to notice,
    // but still don't reveal anything to the caller.
    console.error(`Password reset requested for ${user.email} but no email provider is configured.`);
    return genericResponse;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .update(users)
    .set({ resetTokenHash: hashToken(rawToken), resetTokenExpiresAt: expiresAt })
    .where(eq(users.id, user.id));

  const appUrl = process.env.APP_URL || req.nextUrl.origin;
  const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

  try {
    await sendEmail(
      user.email,
      "Reset your password",
      `<div style="font-family: -apple-system, sans-serif; color: #14171a; max-width: 480px;">
        <h2>Reset your password</h2>
        <p>Someone (hopefully you) requested a password reset for R&D Command Center.</p>
        <p><a href="${resetLink}" style="display: inline-block; background: #2A5DD9; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Reset password</a></p>
        <p style="color: #6b7280; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>
      </div>`
    );
  } catch (err) {
    if (!(err instanceof EmailConfigError)) {
      console.error(`Failed to send password reset email to ${user.email}:`, err);
    }
  }

  return genericResponse;
}