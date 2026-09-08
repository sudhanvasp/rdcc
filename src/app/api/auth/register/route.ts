import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { notify } from "@/lib/notify";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const AVATAR_COLORS = ["#2A5DD9", "#1E8A5F", "#B8860B", "#C0392B", "#8A5FD9", "#0F9BAA"];

// Public self-registration. New accounts land in "pending" and cannot log
// in until an admin approves them from the Team page — nobody can just
// walk in.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "Someone with that email already has an account" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: "member",
      status: "pending",
      avatarColor,
    })
    .returning();

  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  await Promise.all(
    admins.map((a) =>
      notify({
        userId: a.id,
        type: "registration_pending",
        title: "New registration pending approval",
        body: `${created.name} (${created.email})`,
      })
    )
  );

  return NextResponse.json({ ok: true });
}
