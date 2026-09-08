import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bomItems, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  component: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitCost: z.number().nonnegative().optional().nullable(),
  supplier: z.string().optional(),
  partNumber: z.string().optional(),
  status: z.enum(["available", "needed", "ordered", "arrived"]).default("needed"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  const rows = projectId
    ? await db.select().from(bomItems).where(eq(bomItems.projectId, projectId)).orderBy(desc(bomItems.createdAt))
    : await db.select().from(bomItems).orderBy(desc(bomItems.createdAt));

  return NextResponse.json({ bomItems: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db.insert(bomItems).values(parsed.data).returning();

  if (created.status === "needed") {
    const [project] = await db.select().from(projects).where(eq(projects.id, created.projectId)).limit(1);
    if (project && project.ownerId !== session.userId) {
      await notify({
        userId: project.ownerId,
        type: "bom_needed",
        title: "BOM item needed",
        body: `${created.component} (${project.name})`,
        relatedProjectId: project.id,
      });
    }
  }

  return NextResponse.json({ bomItem: created }, { status: 201 });
}
