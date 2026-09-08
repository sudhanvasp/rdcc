import { db } from "@/db";
import { tasks, projects, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { TasksClient } from "@/components/tasks/TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [taskRows, projectRows, userRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        projectName: projects.name,
        assigneeId: tasks.assigneeId,
        assigneeName: users.name,
        assigneeColor: users.avatarColor,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .orderBy(desc(tasks.createdAt)),
    db.select({ id: projects.id, name: projects.name }).from(projects),
    db.select({ id: users.id, name: users.name, avatarColor: users.avatarColor }).from(users).where(eq(users.status, "active")),
  ]);

  return <TasksClient initialTasks={taskRows} projects={projectRows} teamMembers={userRows} />;
}
