import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ideas, projects, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["inbox", "evaluating", "approved", "rejected", "converted", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  estimatedDurationDays: z.number().int().positive().optional().nullable(),
  potentialTechnologies: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
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

  const [updated] = await db
    .update(ideas)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(ideas.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  return NextResponse.json({ idea: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(ideas).where(eq(ideas.id, id));
  return NextResponse.json({ ok: true });
}
