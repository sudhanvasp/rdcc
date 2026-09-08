import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Generates a random, readable-ish password (avoids ambiguous chars like
// 0/O, 1/l) and returns it ONCE in the response — never stored in plain
// text, never logged anywhere (including the audit trail).
function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can reset a password" }, { status: 403 });
  }
  const { id } = await params;

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const newPassword = generatePassword();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));

  await logAudit({
    actorId: session.userId,
    action: "password_reset",
    entityType: "user",
    entityId: id,
    newValue: { email: target.email }, // never the password itself
  });

  return NextResponse.json({ email: target.email, name: target.name, password: newPassword });
}
