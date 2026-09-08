import { db } from "@/db";
import { projects, tasks, calendarEvents } from "@/db/schema";
import { isNotNull } from "drizzle-orm";
import { CalendarClient } from "@/components/calendar/CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [projectRows, taskRows, eventRows] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, deadline: projects.deadline, priority: projects.priority })
      .from(projects)
      .where(isNotNull(projects.deadline)),
    db
      .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, projectId: tasks.projectId, status: tasks.status })
      .from(tasks)
      .where(isNotNull(tasks.dueDate)),
    db.select().from(calendarEvents),
  ]);

  // isNotNull() guarantees these at the SQL level, but Drizzle's inferred
  // column type stays nullable — narrow it here for the client component.
  const projectEvents = projectRows.filter(
    (p): p is typeof p & { deadline: Date } => p.deadline !== null
  );
  const taskEvents = taskRows.filter(
    (t): t is typeof t & { dueDate: Date } => t.dueDate !== null
  );

  return <CalendarClient projectEvents={projectEvents} taskEvents={taskEvents} initialEvents={eventRows} />;
}
