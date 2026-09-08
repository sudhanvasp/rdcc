import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  cost: z.number().nonnegative(),
  billingCycle: z.enum(["monthly", "yearly", "one_time"]).default("monthly"),
  renewalDate: z.string().optional().nullable(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Billing is admin-only" }, { status: 403 });
  }

  const rows = await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  return NextResponse.json({ subscriptions: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Billing is admin-only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { renewalDate, ...rest } = parsed.data;

  const [created] = await db
    .insert(subscriptions)
    .values({
      ...rest,
      renewalDate: renewalDate ? new Date(renewalDate) : undefined,
      purchasedById: session.userId,
    })
    .returning();

  await logAudit({
    actorId: session.userId,
    action: "subscription_created",
    entityType: "subscription",
    entityId: created.id,
    newValue: { name: created.name, cost: created.cost, billingCycle: created.billingCycle },
  });

  return NextResponse.json({ subscription: created }, { status: 201 });
}
