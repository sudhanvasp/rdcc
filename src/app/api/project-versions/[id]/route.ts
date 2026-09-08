import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectVersions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.delete(projectVersions).where(eq(projectVersions.id, id));
  return NextResponse.json({ ok: true });
}
