import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["todo", "in_progress", "blocked", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  order: z.number().int().optional(),
});

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

  const [before] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!before) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const { dueDate, ...rest } = parsed.data;

  const [updated] = await db
    .update(tasks)
    .set({
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id))
    .returning();

  if (parsed.data.status && parsed.data.status !== before.status) {
    await db.insert(activities).values({
      projectId: before.projectId,
      actorId: session.userId,
      type: "task_status_changed",
      message: `Task "${before.title}" moved to ${parsed.data.status.replace("_", " ")}`,
    });
  }

  return NextResponse.json({ task: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(tasks).where(eq(tasks.id, id));
  return NextResponse.json({ ok: true });
}
