import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectMembers,
  tasks,
  users,
  activities,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z
    .enum([
      "idea", "planning", "in_development", "testing",
      "blocked", "review", "completed", "archived",
    ])
    .optional(),
  progress: z.number().int().min(0).max(100).optional(),
  deadline: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  client: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  technologies: z.array(z.string()).optional(),
  blockedReason: z.string().optional().nullable(),
  division: z.enum(["client", "rnd"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const [members, projectTasks, recentActivity] = await Promise.all([
    db
      .select({ userId: users.id, name: users.name, avatarColor: users.avatarColor, roleOnProject: projectMembers.roleOnProject })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, id)),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        assigneeId: tasks.assigneeId,
        assigneeName: users.name,
        order: tasks.order,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.projectId, id))
      .orderBy(asc(tasks.order), asc(tasks.createdAt)),
    db
      .select({
        id: activities.id,
        message: activities.message,
        createdAt: activities.createdAt,
        actorName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.actorId, users.id))
      .where(eq(activities.projectId, id))
      .orderBy(activities.createdAt),
  ]);

  return NextResponse.json({ project, members, tasks: projectTasks, activity: recentActivity.reverse() });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [before] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!before) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { deadline, startDate, ...rest } = parsed.data;

  const [updated] = await db
    .update(projects)
    .set({
      ...rest,
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(rest.status === "blocked" && before.status !== "blocked" ? { blockedSince: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning();

  if (parsed.data.status && parsed.data.status !== before.status) {
    await db.insert(activities).values({
      projectId: id,
      actorId: session.userId,
      type: "project_status_changed",
      message: `Status changed from ${before.status} to ${parsed.data.status}`,
    });

    if (
      (parsed.data.status === "blocked" || parsed.data.status === "completed") &&
      before.ownerId !== session.userId
    ) {
      await notify({
        userId: before.ownerId,
        type: `project_${parsed.data.status}`,
        title: parsed.data.status === "blocked" ? "Project blocked" : "Project completed",
        body: updated.name,
        relatedProjectId: id,
      });
    }
  }

  return NextResponse.json({ project: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can delete a project" }, { status: 403 });
  }
  const { id } = await params;
  const [before] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  await db.delete(projects).where(eq(projects.id, id));
  if (before) {
    await logAudit({
      actorId: session.userId,
      action: "project_deleted",
      entityType: "project",
      entityId: id,
      oldValue: { name: before.name, status: before.status },
    });
  }
  return NextResponse.json({ ok: true });
}