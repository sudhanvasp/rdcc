import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const bodySchema = z.object({ role: z.enum(["admin", "member"]).optional() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can approve registrations" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  const role = parsed.success && parsed.data.role ? parsed.data.role : "member";

  const [updated] = await db
    .update(users)
    .set({ status: "active", role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({
    actorId: session.userId,
    action: "registration_approved",
    entityType: "user",
    entityId: id,
    newValue: { email: updated.email, role },
  });

  return NextResponse.json({ member: { ...updated, passwordHash: undefined } });
}
