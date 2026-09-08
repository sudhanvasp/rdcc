import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, quoteItems } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  clientName: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: quotes.id,
      title: quotes.title,
      clientName: quotes.clientName,
      status: quotes.status,
      convertedProjectId: quotes.convertedProjectId,
      createdAt: quotes.createdAt,
      updatedAt: quotes.updatedAt,
      totalCost: sql<number>`coalesce(sum(${quoteItems.quantity} * ${quoteItems.unitCost}), 0)::float`,
      itemCount: sql<number>`count(${quoteItems.id})::int`,
    })
    .from(quotes)
    .leftJoin(quoteItems, eq(quoteItems.quoteId, quotes.id))
    .groupBy(quotes.id)
    .orderBy(desc(quotes.updatedAt));

  return NextResponse.json({ quotes: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db
    .insert(quotes)
    .values({ ...parsed.data, createdById: session.userId })
    .returning();

  return NextResponse.json({ quote: created }, { status: 201 });
}
