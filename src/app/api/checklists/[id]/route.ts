import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checklists, checklistItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [checklist] = await db.select().from(checklists).where(eq(checklists.id, id)).limit(1);
  if (!checklist) return NextResponse.json({ error: "Checklist not found" }, { status: 404 });

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, id))
    .orderBy(asc(checklistItems.order), asc(checklistItems.createdAt));

  return NextResponse.json({ checklist, items });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(checklists).where(eq(checklists.id, id));
  return NextResponse.json({ ok: true });
}
