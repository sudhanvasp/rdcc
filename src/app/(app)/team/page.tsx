import { db } from "@/db";
import { users, tasks, projects, projectMembers } from "@/db/schema";
import { ne, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { TeamClient } from "@/components/team/TeamClient";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getSession();
  const [allUsers, openTasks, allProjects, memberships, pendingUsers] = await Promise.all([
    db.select().from(users).where(eq(users.status, "active")),
    db.select().from(tasks).where(ne(tasks.status, "done")),
    db.select().from(projects),
    db.select().from(projectMembers),
    session?.role === "admin" ? db.select().from(users).where(eq(users.status, "pending")) : Promise.resolve([]),
  ]);

  const weight = { high: 22, medium: 14, low: 8 } as const;

  const members = allUsers.map((u) => {
    const userTasks = openTasks.filter((t) => t.assigneeId === u.id);
    const projectIds = memberships.filter((m) => m.userId === u.id).map((m) => m.projectId);
    const userProjects = allProjects.filter(
      (p) => projectIds.includes(p.id) && p.status !== "completed" && p.status !== "archived"
    );
    const workload = Math.min(100, userTasks.reduce((sum, t) => sum + weight[t.priority], 0));

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarColor: u.avatarColor,
      skills: u.skills,
      phone: u.phone,
      openTaskCount: userTasks.length,
      workload,
      projectNames: userProjects.slice(0, 4).map((p) => p.name),
    };
  });

  const pending = pendingUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
  }));

  return <TeamClient initialMembers={members} initialPending={pending} isAdmin={session?.role === "admin"} />;
}
