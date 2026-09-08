import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quoteItems, quotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  quoteId: z.string().min(1),
  partName: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  unitCost: z.number().nonnegative().optional(),
  order: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db.insert(quoteItems).values(parsed.data).returning();
  await db.update(quotes).set({ updatedAt: new Date() }).where(eq(quotes.id, parsed.data.quoteId));

  return NextResponse.json({ item: created }, { status: 201 });
}
