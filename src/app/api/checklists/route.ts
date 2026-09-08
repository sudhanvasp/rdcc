import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checklists, checklistItems } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  eventDate: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: checklists.id,
      title: checklists.title,
      eventDate: checklists.eventDate,
      createdAt: checklists.createdAt,
      totalItems: sql<number>`count(${checklistItems.id})::int`,
      packedItems: sql<number>`count(${checklistItems.id}) filter (where ${checklistItems.packed})::int`,
      returnedItems: sql<number>`count(${checklistItems.id}) filter (where ${checklistItems.returned})::int`,
    })
    .from(checklists)
    .leftJoin(checklistItems, eq(checklistItems.checklistId, checklists.id))
    .groupBy(checklists.id)
    .orderBy(desc(checklists.createdAt));

  return NextResponse.json({ checklists: rows });
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
    .insert(checklists)
    .values({
      title: parsed.data.title,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : undefined,
      createdById: session.userId,
    })
    .returning();

  return NextResponse.json({ checklist: created }, { status: 201 });
}
