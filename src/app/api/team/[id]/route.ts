import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["admin", "member"]).optional(),
  skills: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can edit team members" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Normalize to digits only (WhatsApp identifies senders by digit-only
  // international format, e.g. "919876543210").
  const phone = parsed.data.phone != null ? parsed.data.phone.replace(/\D/g, "") || null : parsed.data.phone;

  const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!before) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (parsed.data.email && parsed.data.email.toLowerCase() !== before.email) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, parsed.data.email.toLowerCase()), ne(users.id, id)))
      .limit(1);
    if (taken) {
      return NextResponse.json({ error: "Someone else already uses that email" }, { status: 409 });
    }
  }

  const email = parsed.data.email ? parsed.data.email.toLowerCase() : undefined;

  const [updated] = await db
    .update(users)
    .set({ ...parsed.data, email, phone, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  if (parsed.data.role && parsed.data.role !== before.role) {
    await logAudit({
      actorId: session.userId,
      action: "role_changed",
      entityType: "user",
      entityId: id,
      oldValue: { role: before.role },
      newValue: { role: parsed.data.role },
    });
  }

  if (email && email !== before.email) {
    await logAudit({
      actorId: session.userId,
      action: "email_changed",
      entityType: "user",
      entityId: id,
      oldValue: { email: before.email },
      newValue: { email },
    });
  }

  return NextResponse.json({ member: { ...updated, passwordHash: undefined } });
}
