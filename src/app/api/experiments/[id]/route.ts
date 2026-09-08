import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { experiments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  hypothesis: z.string().optional().nullable(),
  objective: z.string().optional().nullable(),
  setup: z.string().optional().nullable(),
  variables: z.string().optional().nullable(),
  expectedResult: z.string().optional().nullable(),
  actualResult: z.string().optional().nullable(),
  conclusion: z.string().optional().nullable(),
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
    .update(experiments)
    .set(parsed.data)
    .where(eq(experiments.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
  return NextResponse.json({ experiment: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(experiments).where(eq(experiments.id, id));
  return NextResponse.json({ ok: true });
}
