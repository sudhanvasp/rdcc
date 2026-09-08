import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { desc, ilike } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().int().nonnegative().default(0),
  unitCost: z.number().nonnegative().optional().nullable(),
  supplier: z.string().optional(),
  partNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q");
  const rows = q
    ? await db.select().from(inventoryItems).where(ilike(inventoryItems.name, `%${q}%`)).orderBy(desc(inventoryItems.createdAt))
    : await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));

  return NextResponse.json({ inventoryItems: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db.insert(inventoryItems).values(parsed.data).returning();
  return NextResponse.json({ inventoryItem: created }, { status: 201 });
}
