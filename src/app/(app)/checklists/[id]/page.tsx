import { notFound } from "next/navigation";
import { db } from "@/db";
import { checklists, checklistItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { ChecklistDetailClient } from "@/components/checklists/ChecklistDetailClient";

export const dynamic = "force-dynamic";

export default async function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [checklist] = await db.select().from(checklists).where(eq(checklists.id, id)).limit(1);
  if (!checklist) notFound();

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, id))
    .orderBy(asc(checklistItems.order), asc(checklistItems.createdAt));

  return <ChecklistDetailClient checklist={checklist} initialItems={items} />;
}
