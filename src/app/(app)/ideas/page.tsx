import { db } from "@/db";
import { ideas, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { IdeasClient } from "@/components/ideas/IdeasClient";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const [ideaRows, userRows] = await Promise.all([
    db
      .select({
        id: ideas.id,
        title: ideas.title,
        description: ideas.description,
        status: ideas.status,
        priority: ideas.priority,
        category: ideas.category,
        estimatedComplexity: ideas.estimatedComplexity,
        estimatedDurationDays: ideas.estimatedDurationDays,
        potentialTechnologies: ideas.potentialTechnologies,
        notes: ideas.notes,
        createdAt: ideas.createdAt,
        assigneeId: ideas.assigneeId,
        assigneeName: users.name,
      })
      .from(ideas)
      .leftJoin(users, eq(ideas.assigneeId, users.id))
      .orderBy(desc(ideas.createdAt)),
    db.select({ id: users.id, name: users.name, avatarColor: users.avatarColor }).from(users).where(eq(users.status, "active")),
  ]);

  return <IdeasClient initialIdeas={ideaRows} teamMembers={userRows} />;
}
