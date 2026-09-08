import { db } from "@/db";
import { tasks, notifications } from "@/db/schema";
import { and, eq, ne, isNotNull, gte, desc } from "drizzle-orm";
import { notify } from "./notify";

const DEDUPE_HOURS = 20;

// Runs periodically. For each open task with a due date, notifies the
// assignee at most once per ~20 hours per task — checked against existing
// notifications rather than a separate cooldown table, so a restart never
// causes duplicates.
export async function checkTaskDeadlineNotifications() {
  const now = new Date();
  const soonCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dedupeCutoff = new Date(now.getTime() - DEDUPE_HOURS * 60 * 60 * 1000);

  const openTasks = await db
    .select()
    .from(tasks)
    .where(and(ne(tasks.status, "done"), isNotNull(tasks.dueDate), isNotNull(tasks.assigneeId)));

  for (const t of openTasks) {
    if (!t.dueDate || !t.assigneeId) continue;

    const isOverdue = t.dueDate < now;
    const isDueSoon = !isOverdue && t.dueDate <= soonCutoff;
    if (!isOverdue && !isDueSoon) continue;

    const type = isOverdue ? "task_overdue" : "task_due_soon";

    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.relatedTaskId, t.id),
          eq(notifications.type, type),
          gte(notifications.createdAt, dedupeCutoff)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1);
    if (existing) continue;

    await notify({
      userId: t.assigneeId,
      type,
      title: isOverdue ? "Task overdue" : "Task due soon",
      body: t.title,
      relatedTaskId: t.id,
      relatedProjectId: t.projectId,
    });
  }
}
