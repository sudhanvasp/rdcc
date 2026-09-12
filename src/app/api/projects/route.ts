import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, projectMembers, activities } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  objective: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  category: z.string().optional(),
  client: z.string().optional(),
  deadline: z.string().optional().nullable(),
  technologies: z.array(z.string()).optional(),
  memberIds: z.array(z.string()).optional(),
  division: z.enum(["client", "rnd"]).default("rnd"),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { memberIds, deadline, ...rest } = parsed.data;

  const [created] = await db
    .insert(projects)
    .values({
      ...rest,
      deadline: deadline ? new Date(deadline) : undefined,
      ownerId: session.userId,
    })
    .returning();

  const members = Array.from(new Set([session.userId, ...(memberIds ?? [])]));
  await db.insert(projectMembers).values(
    members.map((userId) => ({ projectId: created.id, userId }))
  );

  await db.insert(activities).values({
    projectId: created.id,
    actorId: session.userId,
    type: "project_created",
    message: `Project "${created.name}" created`,
  });

  return NextResponse.json({ project: created }, { status: 201 });
}