import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  quantity: z.number().int().nonnegative().optional(),
  unitCost: z.number().nonnegative().optional().nullable(),
  supplier: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
    .update(inventoryItems)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(inventoryItems.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ inventoryItem: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  return NextResponse.json({ ok: true });
}
