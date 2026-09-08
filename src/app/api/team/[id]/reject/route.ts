import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can reject registrations" }, { status: 403 });
  }
  const { id } = await params;

  const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!before || before.status !== "pending") {
    return NextResponse.json({ error: "Not a pending registration" }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, id));

  await logAudit({
    actorId: session.userId,
    action: "registration_rejected",
    entityType: "user",
    entityId: id,
    oldValue: { email: before.email },
  });

  return NextResponse.json({ ok: true });
}
