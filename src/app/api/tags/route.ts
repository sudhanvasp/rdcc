import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const COLORS = ["#2A5DD9", "#1E8A5F", "#B8860B", "#C0392B", "#8A5FD9", "#0F9BAA"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(tags);
  return NextResponse.json({ tags: rows });
}

const createSchema = z.object({ name: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const [created] = await db.insert(tags).values({ name: parsed.data.name, color }).returning();
  return NextResponse.json({ tag: created }, { status: 201 });
}
