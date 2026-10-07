import { db } from "@/db";
import { dailyLogs, projects, users } from "@/db/schema";
import { and, asc, eq, ne, or } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { DailyLogClient } from "@/components/daily-log/DailyLogClient";
import { getWorkspaceTimezone } from "@/lib/work-report";
import { isValidYmd, ymdInZone } from "@/lib/work-report-model";

export const dynamic = "force-dynamic";

export default async function DailyLogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  const viewerId = session?.userId ?? "";
  const { date: requested } = await searchParams;

  // "Today" is the workspace's day, so everyone on the team agrees on it.
  const today = ymdInZone(new Date(), await getWorkspaceTimezone());
  const date = requested && isValidYmd(requested) && requested <= today ? requested : today;

  const [entries, projectRows, memberRows] = await Promise.all([
    db
      .select({
        id: dailyLogs.id,
        userId: dailyLogs.userId,
        userName: users.name,
        avatarColor: users.avatarColor,
        projectId: dailyLogs.projectId,
        projectName: projects.name,
        body: dailyLogs.body,
        visibility: dailyLogs.visibility,
      })
      .from(dailyLogs)
      .innerJoin(users, eq(dailyLogs.userId, users.id))
      .leftJoin(projects, eq(dailyLogs.projectId, projects.id))
      .where(
        and(
          eq(dailyLogs.logDate, date),
          // Public updates for everyone; private ones only for the person who wrote them.
          or(eq(dailyLogs.visibility, "public"), eq(dailyLogs.userId, viewerId))
        )
      )
      .orderBy(asc(dailyLogs.createdAt)),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(ne(projects.status, "archived"))
      .orderBy(asc(projects.name)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.status, "active"))
      .orderBy(asc(users.name)),
  ]);

  return (
    <DailyLogClient
      date={date}
      today={today}
      entries={entries}
      projects={projectRows}
      members={memberRows}
      currentUserId={viewerId}
      isAdmin={session?.role === "admin"}
    />
  );
}