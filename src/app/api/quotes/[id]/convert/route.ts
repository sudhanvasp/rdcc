import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, quoteItems, projects, projectMembers, bomItems, activities } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Once a client approves a BOM quote, this creates the real Project and
// copies the line items into that project's BOM tab (as "needed" — nothing
// has actually been bought yet).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) return NextResponse.json({ error: "BOM not found" }, { status: 404 });
  if (quote.convertedProjectId) {
    return NextResponse.json({ error: "This BOM was already converted to a project" }, { status: 400 });
  }

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id))
    .orderBy(asc(quoteItems.order));

  const [project] = await db
    .insert(projects)
    .values({
      name: quote.title,
      client: quote.clientName ?? undefined,
      ownerId: session.userId,
      status: "planning",
    })
    .returning();

  await db.insert(projectMembers).values({ projectId: project.id, userId: session.userId });

  if (items.length > 0) {
    await db.insert(bomItems).values(
      items.map((item) => ({
        projectId: project.id,
        component: item.partName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        status: "needed" as const,
      }))
    );
  }

  await db
    .update(quotes)
    .set({ status: "won", convertedProjectId: project.id, updatedAt: new Date() })
    .where(eq(quotes.id, id));

  await db.insert(activities).values({
    projectId: project.id,
    actorId: session.userId,
    type: "project_created",
    message: `Project created from approved BOM "${quote.title}"`,
  });

  return NextResponse.json({ project }, { status: 201 });
}
