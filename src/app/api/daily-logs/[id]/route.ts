import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { canChangeVisibility, canDeleteEntry, canViewEntry } from "@/lib/daily-log-access";
import { z } from "zod";

const patchSchema = z.object({
  visibility: z.enum(["public", "private"], { error: "Visibility must be public or private" }),
});

async function load(id: string) {
  const [entry] = await db.select().from(dailyLogs).where(eq(dailyLogs.id, id)).limit(1);
  return entry;
}

// Someone else's private update is invisible to you, so as far as you can
// tell it doesn't exist.
const gone = () => NextResponse.json({ error: "That update no longer exists" }, { status: 404 });

// People can remove their own entries (e.g. a typo); an admin can also remove
// anyone's public entry.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const entry = await load(id);
  if (!entry || !canViewEntry(entry, session.userId)) return gone();
  if (!canDeleteEntry(entry, { id: session.userId, role: session.role })) {
    return NextResponse.json({ error: "You can only delete your own updates" }, { status: 403 });
  }

  await db.delete(dailyLogs).where(eq(dailyLogs.id, id));
  return NextResponse.json({ ok: true });
}

// Switch one of your own updates between public and private.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const entry = await load(id);
  if (!entry || !canViewEntry(entry, session.userId)) return gone();
  if (!canChangeVisibility(entry, session.userId)) {
    return NextResponse.json({ error: "You can only change your own updates" }, { status: 403 });
  }

  const [updated] = await db
    .update(dailyLogs)
    .set({ visibility: parsed.data.visibility })
    .where(eq(dailyLogs.id, id))
    .returning();
  return NextResponse.json({ entry: updated });
}