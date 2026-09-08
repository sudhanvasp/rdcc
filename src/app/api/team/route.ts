import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks, projectMembers } from "@/db/schema";
import { eq, ne } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const AVATAR_COLORS = ["#2A5DD9", "#1E8A5F", "#B8860B", "#C0392B", "#8A5FD9", "#0F9BAA"];

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "member"]).default("member"),
  skills: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allUsers = await db.select().from(users).where(eq(users.status, "active"));
  const allTasks = await db.select().from(tasks).where(ne(tasks.status, "done"));
  const allMemberships = await db.select().from(projectMembers);

  const team = allUsers.map((u) => ({
    ...u,
    passwordHash: undefined,
    openTasks: allTasks.filter((t) => t.assigneeId === u.id).length,
    activeProjects: new Set(
      allMemberships.filter((m) => m.userId === u.id).map((m) => m.projectId)
    ).size,
  }));

  // Only admins need to see who's waiting for approval.
  const pending =
    session.role === "admin"
      ? (await db.select().from(users).where(eq(users.status, "pending"))).map((u) => ({
          ...u,
          passwordHash: undefined,
        }))
      : [];

  return NextResponse.json({ team, pending });
}

// Admin-only: add a new team member. The admin sets an initial password and
// shares it with the person directly — there's no email/invite system yet.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only an admin can add team members" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "Someone with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const phone = parsed.data.phone ? parsed.data.phone.replace(/\D/g, "") || undefined : undefined;

  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      phone,
      passwordHash,
      role: parsed.data.role,
      skills: parsed.data.skills ?? [],
      avatarColor,
    })
    .returning();

  return NextResponse.json({ member: { ...created, passwordHash: undefined } }, { status: 201 });
}
