import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quoteItems, quotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  partName: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  unitCost: z.number().nonnegative().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [updated] = await db
    .update(quoteItems)
    .set(parsed.data)
    .where(eq(quoteItems.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  await db.update(quotes).set({ updatedAt: new Date() }).where(eq(quotes.id, updated.quoteId));

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(quoteItems).where(eq(quoteItems.id, id));
  return NextResponse.json({ ok: true });
}
