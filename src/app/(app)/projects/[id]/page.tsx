import { notFound } from "next/navigation";
import { db } from "@/db";
import { projects, projectMembers, tasks, users, activities, bomItems, experiments, links, tags, projectTags, projectVersions, taskDependencies } from "@/db/schema";
import { eq, asc, desc, inArray } from "drizzle-orm";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) notFound();

  const [members, projectTasks, activityRows, teamMembers, bomRows, experimentRows, linkRows, allTags, projectTagRows, versionRows] = await Promise.all([
    db
      .select({ userId: users.id, name: users.name, avatarColor: users.avatarColor, roleOnProject: projectMembers.roleOnProject })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, id)),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        assigneeId: tasks.assigneeId,
        assigneeName: users.name,
        assigneeColor: users.avatarColor,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.projectId, id))
      .orderBy(asc(tasks.createdAt)),
    db
      .select({
        id: activities.id,
        message: activities.message,
        createdAt: activities.createdAt,
        actorName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.actorId, users.id))
      .where(eq(activities.projectId, id))
      .orderBy(asc(activities.createdAt)),
    db.select({ id: users.id, name: users.name, avatarColor: users.avatarColor }).from(users).where(eq(users.status, "active")),
    db.select().from(bomItems).where(eq(bomItems.projectId, id)).orderBy(desc(bomItems.createdAt)),
    db.select().from(experiments).where(eq(experiments.projectId, id)).orderBy(desc(experiments.date)),
    db.select().from(links).where(eq(links.projectId, id)).orderBy(desc(links.createdAt)),
    db.select().from(tags),
    db
      .select({ tagId: projectTags.tagId, name: tags.name, color: tags.color })
      .from(projectTags)
      .innerJoin(tags, eq(projectTags.tagId, tags.id))
      .where(eq(projectTags.projectId, id)),
    db.select().from(projectVersions).where(eq(projectVersions.projectId, id)).orderBy(desc(projectVersions.createdAt)),
  ]);

  const taskIds = projectTasks.map((t) => t.id);
  const dependencyRows = taskIds.length
    ? await db
        .select({
          taskId: taskDependencies.taskId,
          dependsOnId: taskDependencies.dependsOnId,
          dependsOnTitle: tasks.title,
          dependsOnStatus: tasks.status,
        })
        .from(taskDependencies)
        .innerJoin(tasks, eq(taskDependencies.dependsOnId, tasks.id))
        .where(inArray(taskDependencies.taskId, taskIds))
    : [];

  return (
    <ProjectWorkspace
      project={project}
      members={members}
      tasks={projectTasks}
      activity={activityRows.reverse()}
      teamMembers={teamMembers}
      bomItems={bomRows}
      experiments={experimentRows}
      links={linkRows}
      allTags={allTags}
      projectTags={projectTagRows}
      versions={versionRows}
      dependencies={dependencyRows}
    />
  );
}
