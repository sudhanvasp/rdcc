import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendingDigests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(pendingDigests)
    .where(eq(pendingDigests.status, "pending"))
    .orderBy(desc(pendingDigests.createdAt));

  return NextResponse.json({ digests: rows });
}
