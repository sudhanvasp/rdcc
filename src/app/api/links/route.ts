import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { links } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  type: z
    .enum(["google_sheet", "google_drive", "github", "figma", "youtube", "other"])
    .default("other"),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const rows = await db
    .select()
    .from(links)
    .where(eq(links.projectId, projectId))
    .orderBy(desc(links.createdAt));

  return NextResponse.json({ links: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db.insert(links).values(parsed.data).returning();
  return NextResponse.json({ link: created }, { status: 201 });
}
