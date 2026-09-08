import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bomItems, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { z } from "zod";

const updateSchema = z.object({
  component: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  quantity: z.number().int().positive().optional(),
  unitCost: z.number().nonnegative().optional().nullable(),
  supplier: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  status: z.enum(["available", "needed", "ordered", "arrived"]).optional(),
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

  const [before] = await db.select().from(bomItems).where(eq(bomItems.id, id)).limit(1);

  const [updated] = await db
    .update(bomItems)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(bomItems.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "BOM item not found" }, { status: 404 });

  if (parsed.data.status === "needed" && before?.status !== "needed") {
    const [project] = await db.select().from(projects).where(eq(projects.id, updated.projectId)).limit(1);
    if (project && project.ownerId !== session.userId) {
      await notify({
        userId: project.ownerId,
        type: "bom_needed",
        title: "BOM item needed",
        body: `${updated.component} (${project.name})`,
        relatedProjectId: project.id,
      });
    }
  }

  return NextResponse.json({ bomItem: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(bomItems).where(eq(bomItems.id, id));
  return NextResponse.json({ ok: true });
}
