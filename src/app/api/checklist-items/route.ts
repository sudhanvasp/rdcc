import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { checklistItems } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  checklistId: z.string().min(1),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [created] = await db.insert(checklistItems).values(parsed.data).returning();
  return NextResponse.json({ item: created }, { status: 201 });
}
