import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyLogs, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { cleanText } from "@/lib/text-transport";
import { getWorkspaceTimezone } from "@/lib/work-report";
import { dbHint, rootCauseMessage } from "@/lib/error-message";
import { isValidYmd, ymdInZone } from "@/lib/work-report-model";
import { z } from "zod";

const createSchema = z.object({
  logDate: z.string().refine(isValidYmd, "Pick a valid date"),
  body: z.string().max(2000, "Keep it under 2,000 characters"),
  projectId: z.string().min(1).nullable().optional(),
  visibility: z.enum(["public", "private"], { error: "Visibility must be public or private" }).default("public"),
});

// Add today's (or an earlier day's) update for the logged-in person.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You're logged out — please log in again." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const text = cleanText(parsed.data.body).trim();
  if (!text) {
    return NextResponse.json({ error: "Write what you worked on first" }, { status: 400 });
  }

  const today = ymdInZone(new Date(), await getWorkspaceTimezone());
  if (parsed.data.logDate > today) {
    return NextResponse.json({ error: "You can't log an update for a future date" }, { status: 400 });
  }

  const projectId = parsed.data.projectId ?? null;
  if (projectId) {
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
      return NextResponse.json({ error: "That project no longer exists" }, { status: 400 });
    }
  }

  try {
    const [created] = await db
      .insert(dailyLogs)
      .values({
        userId: session.userId,
        projectId,
        logDate: parsed.data.logDate,
        body: text,
        visibility: parsed.data.visibility,
      })
      .returning();
    return NextResponse.json({ entry: created }, { status: 201 });
  } catch (err) {
    console.error("Failed to save daily log entry:", err);
    const hint = dbHint(rootCauseMessage(err));
    return NextResponse.json(
      { error: `The server couldn't save that update.${hint ? ` ${hint}` : " See the runtime logs for details."}` },
      { status: 500 }
    );
  }
}