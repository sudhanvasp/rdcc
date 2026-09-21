import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ active: z.boolean() });

// Deactivating someone (e.g. they left the company) revokes their login
// and hides them from the Team page and assignment pickers, but keeps
// their user row intact so their name still shows correctly on past
// projects, tasks, and activity history. Reactivating just flips it back.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can deactivate a team member" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (id === session.userId) {
    return NextResponse.json({ error: "You can't deactivate your own account" }, { status: 400 });
  }

  const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!before) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (before.status === "pending") {
    return NextResponse.json({ error: "This person hasn't been approved yet — reject or approve their registration instead" }, { status: 400 });
  }

  const newStatus = parsed.data.active ? "active" : "deactivated";
  const [updated] = await db
    .update(users)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  await logAudit({
    actorId: session.userId,
    action: parsed.data.active ? "member_reactivated" : "member_deactivated",
    entityType: "user",
    entityId: id,
    oldValue: { email: before.email, status: before.status },
    newValue: { status: newStatus },
  });

  return NextResponse.json({ member: { ...updated, passwordHash: undefined } });
}