import { db } from "@/db";
import { projects, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { ProjectsClient } from "@/components/projects/ProjectsClient";

export const dynamic = "force-dynamic";

export default async function RdPage() {
  const [projectRows, userRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.division, "rnd")).orderBy(desc(projects.createdAt)),
    db.select({ id: users.id, name: users.name, avatarColor: users.avatarColor }).from(users).where(eq(users.status, "active")),
  ]);

  return <ProjectsClient initialProjects={projectRows} teamMembers={userRows} division="rnd" />;
}