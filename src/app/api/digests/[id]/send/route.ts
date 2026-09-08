import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pendingDigests, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { sendEmail, EmailConfigError } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;

  const [digest] = await db.select().from(pendingDigests).where(eq(pendingDigests.id, id)).limit(1);
  if (!digest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (digest.status !== "pending") {
    return NextResponse.json({ error: "This digest was already handled" }, { status: 400 });
  }

  try {
    await sendEmail(digest.recipientEmail, digest.subject, digest.html);
  } catch (err) {
    const message = err instanceof EmailConfigError ? err.message : `Send failed: ${err instanceof Error ? err.message : "unknown error"}`;
    return NextResponse.json({ error: message }, { status: err instanceof EmailConfigError ? 503 : 502 });
  }

  await db.update(pendingDigests).set({ status: "sent", sentAt: new Date() }).where(eq(pendingDigests.id, id));
  await db.update(users).set({ lastDigestSentAt: new Date() }).where(eq(users.id, digest.userId));

  return NextResponse.json({ ok: true });
}
