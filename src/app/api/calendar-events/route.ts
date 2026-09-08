import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(calendarEvents);
  return NextResponse.json({ events: rows });
}

const createSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db
    .insert(calendarEvents)
    .values({ title: parsed.data.title, date: new Date(parsed.data.date), createdById: session.userId })
    .returning();

  return NextResponse.json({ event: created }, { status: 201 });
}
