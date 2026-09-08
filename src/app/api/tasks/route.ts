import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, projects, users, activities } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional().nullable(),
  estimateDays: z.number().positive().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectName: projects.name,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      assigneeColor: users.avatarColor,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .orderBy(desc(tasks.createdAt));

  return NextResponse.json({ tasks: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { dueDate, ...rest } = parsed.data;

  const [created] = await db
    .insert(tasks)
    .values({ ...rest, dueDate: dueDate ? new Date(dueDate) : undefined })
    .returning();

  await db.insert(activities).values({
    projectId: created.projectId,
    actorId: session.userId,
    type: "task_created",
    message: `Task "${created.title}" created`,
  });

  if (created.assigneeId && created.assigneeId !== session.userId) {
    await notify({
      userId: created.assigneeId,
      type: "task_assigned",
      title: "New task assigned",
      body: created.title,
      relatedTaskId: created.id,
      relatedProjectId: created.projectId,
    });
  }

  return NextResponse.json({ task: created }, { status: 201 });
}
