import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { experiments, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  hypothesis: z.string().optional(),
  objective: z.string().optional(),
  setup: z.string().optional(),
  variables: z.string().optional(),
  expectedResult: z.string().optional(),
  actualResult: z.string().optional(),
  conclusion: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");

  const rows = await db
    .select({
      id: experiments.id,
      name: experiments.name,
      hypothesis: experiments.hypothesis,
      objective: experiments.objective,
      setup: experiments.setup,
      variables: experiments.variables,
      expectedResult: experiments.expectedResult,
      actualResult: experiments.actualResult,
      conclusion: experiments.conclusion,
      date: experiments.date,
      projectId: experiments.projectId,
      projectName: projects.name,
    })
    .from(experiments)
    .leftJoin(projects, eq(experiments.projectId, projects.id))
    .where(projectId ? eq(experiments.projectId, projectId) : undefined)
    .orderBy(desc(experiments.date));

  return NextResponse.json({ experiments: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db.insert(experiments).values(parsed.data).returning();
  return NextResponse.json({ experiment: created }, { status: 201 });
}
