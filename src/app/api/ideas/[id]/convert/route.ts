import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ideas, projects, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// Idea -> Project conversion (spec section 10: "Every approved idea can
// become a project").
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [idea] = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1);
  if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  if (idea.status === "converted") {
    return NextResponse.json({ error: "Idea already converted" }, { status: 400 });
  }

  const [project] = await db
    .insert(projects)
    .values({
      name: idea.title,
      description: idea.description,
      priority: idea.priority,
      category: idea.category,
      technologies: idea.potentialTechnologies,
      ownerId: idea.assigneeId ?? session.userId,
      ideaId: idea.id,
      status: "planning",
    })
    .returning();

  await db
    .update(ideas)
    .set({ status: "converted", convertedProjectId: project.id, updatedAt: new Date() })
    .where(eq(ideas.id, id));

  await db.insert(activities).values({
    projectId: project.id,
    actorId: session.userId,
    type: "project_created",
    message: `Project created from idea "${idea.title}"`,
  });

  return NextResponse.json({ project }, { status: 201 });
}
