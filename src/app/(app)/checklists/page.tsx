import { db } from "@/db";
import { checklists, checklistItems } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { ChecklistsClient } from "@/components/checklists/ChecklistsClient";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
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

  return <ChecklistsClient initialChecklists={rows} />;
}
