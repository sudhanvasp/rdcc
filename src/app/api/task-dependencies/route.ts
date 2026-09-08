import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taskDependencies } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ taskId: z.string().min(1), dependsOnId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (parsed.data.taskId === parsed.data.dependsOnId) {
    return NextResponse.json({ error: "A task can't depend on itself" }, { status: 400 });
  }

  const [created] = await db.insert(taskDependencies).values(parsed.data).onConflictDoNothing().returning();
  return NextResponse.json({ dependency: created }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const taskId = req.nextUrl.searchParams.get("taskId");
  const dependsOnId = req.nextUrl.searchParams.get("dependsOnId");
  if (!taskId || !dependsOnId) return NextResponse.json({ error: "taskId and dependsOnId are required" }, { status: 400 });

  await db
    .delete(taskDependencies)
    .where(and(eq(taskDependencies.taskId, taskId), eq(taskDependencies.dependsOnId, dependsOnId)));
  return NextResponse.json({ ok: true });
}
