// Reads what the report needs from the database, builds the report model,
// and renders it as a Word document. The pure parts live in
// work-report-model.ts and work-report-docx.ts.

import { db } from "@/db";
import { projects, tasks, projectMembers, users, dailyLogs, workspaces } from "@/db/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { buildReportModel, ymdInZone } from "./work-report-model";
import { renderWorkReport } from "./work-report-docx";

const DEFAULT_TIMEZONE = "Asia/Kolkata";

export async function getWorkspaceTimezone(): Promise<string> {
  const [ws] = await db.select({ timezone: workspaces.timezone }).from(workspaces).limit(1);
  return ws?.timezone ?? DEFAULT_TIMEZONE;
}

export async function generateWorkReport(opts: {
  fromYmd: string;
  toYmd: string;
  preparedBy: string;
}): Promise<{ buffer: Buffer; filename: string }> {
  const tz = await getWorkspaceTimezone();
  const todayYmd = ymdInZone(new Date(), tz);

  const [projectRows, taskRows, memberRows, logRows] = await Promise.all([
    db.select().from(projects),
    db
      .select({
        projectId: tasks.projectId,
        title: tasks.title,
        status: tasks.status,
        dueDate: tasks.dueDate,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks),
    db
      .select({ projectId: projectMembers.projectId, name: users.name })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id)),
    db
      .select({
        logDate: dailyLogs.logDate,
        userName: users.name,
        projectId: dailyLogs.projectId,
        body: dailyLogs.body,
      })
      .from(dailyLogs)
      .innerJoin(users, eq(dailyLogs.userId, users.id))
      .where(
        and(
          gte(dailyLogs.logDate, opts.fromYmd),
          lte(dailyLogs.logDate, opts.toYmd),
          // Private updates are for their author only, so they never reach a shared report.
          eq(dailyLogs.visibility, "public")
        )
      )
      .orderBy(asc(dailyLogs.logDate), asc(dailyLogs.createdAt)),
  ]);

  const model = buildReportModel(
    { projects: projectRows, tasks: taskRows, members: memberRows, logs: logRows },
    { fromYmd: opts.fromYmd, toYmd: opts.toYmd, todayYmd, tz, preparedBy: opts.preparedBy }
  );
  const buffer = await renderWorkReport(model);
  return { buffer, filename: model.filename };
}