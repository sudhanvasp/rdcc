import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  cost: z.number().nonnegative().optional(),
  billingCycle: z.enum(["monthly", "yearly", "one_time"]).optional(),
  renewalDate: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Billing is admin-only" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { renewalDate, ...rest } = parsed.data;

  const [before] = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);

  const [updated] = await db
    .update(subscriptions)
    .set({
      ...rest,
      ...(renewalDate !== undefined ? { renewalDate: renewalDate ? new Date(renewalDate) : null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  await logAudit({
    actorId: session.userId,
    action: "subscription_updated",
    entityType: "subscription",
    entityId: id,
    oldValue: before ? { name: before.name, cost: before.cost } : undefined,
    newValue: { name: updated.name, cost: updated.cost },
  });

  return NextResponse.json({ subscription: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Billing is admin-only" }, { status: 403 });
  }
  const { id } = await params;
  const [before] = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  await db.delete(subscriptions).where(eq(subscriptions.id, id));
  if (before) {
    await logAudit({
      actorId: session.userId,
      action: "subscription_deleted",
      entityType: "subscription",
      entityId: id,
      oldValue: { name: before.name, cost: before.cost },
    });
  }
  return NextResponse.json({ ok: true });
}
