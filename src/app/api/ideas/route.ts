import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ideas, users } from "@/db/schema";
import { desc, eq, ne, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  category: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  estimatedDurationDays: z.number().int().positive().optional().nullable(),
  potentialTechnologies: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: ideas.id,
      title: ideas.title,
      description: ideas.description,
      status: ideas.status,
      priority: ideas.priority,
      category: ideas.category,
      estimatedComplexity: ideas.estimatedComplexity,
      estimatedDurationDays: ideas.estimatedDurationDays,
      potentialTechnologies: ideas.potentialTechnologies,
      notes: ideas.notes,
      createdAt: ideas.createdAt,
      assigneeId: ideas.assigneeId,
      assigneeName: users.name,
    })
    .from(ideas)
    .leftJoin(users, eq(ideas.assigneeId, users.id))
    .orderBy(desc(ideas.createdAt));

  return NextResponse.json({ ideas: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db
    .insert(ideas)
    .values({
      ...parsed.data,
      creatorId: session.userId,
    })
    .returning();

  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), ne(users.id, session.userId)));
  await Promise.all(
    admins.map((a) =>
      notify({
        userId: a.id,
        type: "idea_created",
        title: "New idea captured",
        body: created.title,
      })
    )
  );

  return NextResponse.json({ idea: created }, { status: 201 });
}
