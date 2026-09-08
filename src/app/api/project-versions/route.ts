import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectVersions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().min(1),
  label: z.string().min(1),
  changes: z.string().optional(),
  code: z.string().optional(),
  language: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db
    .insert(projectVersions)
    .values({ ...parsed.data, createdById: session.userId })
    .returning();

  return NextResponse.json({ version: created }, { status: 201 });
}
