import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [ws] = await db.select().from(workspaces).limit(1);
  return NextResponse.json({ workspace: ws ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can change workspace settings" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [existing] = await db.select().from(workspaces).limit(1);
  let updated;
  if (existing) {
    [updated] = await db
      .update(workspaces)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(workspaces.id, existing.id))
      .returning();
    await logAudit({
      actorId: session.userId,
      action: "workspace_updated",
      entityType: "workspace",
      entityId: existing.id,
      oldValue: { name: existing.name, timezone: existing.timezone },
      newValue: parsed.data,
    });
  } else {
    [updated] = await db.insert(workspaces).values(parsed.data).returning();
  }

  return NextResponse.json({ workspace: updated });
}
