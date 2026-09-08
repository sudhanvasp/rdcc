import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pendingDigests, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Dismiss without sending. Still resets the user's cooldown timer, so we
// don't re-prepare the same digest again a minute later.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;

  const [digest] = await db.select().from(pendingDigests).where(eq(pendingDigests.id, id)).limit(1);
  if (!digest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.update(pendingDigests).set({ status: "dismissed" }).where(eq(pendingDigests.id, id));
  await db.update(users).set({ lastDigestSentAt: new Date() }).where(eq(users.id, digest.userId));

  return NextResponse.json({ ok: true });
}
