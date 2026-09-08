import Link from "next/link";
import { db } from "@/db";
import { projects, tasks, users, activities, ideas } from "@/db/schema";
import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, Dot } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Avatar } from "@/components/ui/Avatar";
import { PRIORITY_META, PROJECT_STATUS_META, dueLabel, formatDate } from "@/lib/utils";
import { AlertTriangle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);

  const [
    allProjects,
    allUsers,
    allTasks,
    recentActivity,
    ideaCount,
  ] = await Promise.all([
    db.select().from(projects),
    db.select().from(users).where(eq(users.status, "active")),
    db.select().from(tasks),
    db
      .select({
        id: activities.id,
        message: activities.message,
        createdAt: activities.createdAt,
        projectId: activities.projectId,
        projectName: projects.name,
        actorName: users.name,
      })
      .from(activities)
      .leftJoin(projects, eq(activities.projectId, projects.id))
      .leftJoin(users, eq(activities.actorId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(6),
    db.select({ count: sql<number>`count(*)::int` }).from(ideas).where(ne(ideas.status, "converted")),
  ]);

  const activeProjects = allProjects.filter(
    (p) => p.status !== "completed" && p.status !== "archived"
  );
  const blockedProjects = allProjects.filter((p) => p.status === "blocked");
  const completedProjects = allProjects.filter((p) => p.status === "completed");
  const tasksDueThisWeek = allTasks.filter(
    (t) => t.dueDate && t.dueDate >= now && t.dueDate <= weekFromNow && t.status !== "done"
  );
  const overdueTasks = allTasks.filter(
    (t) => t.dueDate && t.dueDate < now && t.status !== "done"
  );

  const priorityProjects = [...activeProjects]
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 5);

  const workload = allUsers.map((u) => {
    const userTasks = allTasks.filter(
      (t) => t.assigneeId === u.id && t.status !== "done"
    );
    // Simple workload proxy: open tasks weighted by priority, capped at 100.
    const weight = { high: 22, medium: 14, low: 8 } as const;
    const score = Math.min(
      100,
      userTasks.reduce((sum, t) => sum + weight[t.priority], 0)
    );
    return { user: u, score, openTasks: userTasks.length };
  });

  const upcoming = [...allTasks]
    .filter((t) => t.dueDate && t.status !== "done")
    .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
    .slice(0, 6);

  const stats = [
    { label: "Active Projects", value: activeProjects.length },
    { label: "Open Ideas", value: ideaCount[0]?.count ?? 0 },
    { label: "Due This Week", value: tasksDueThisWeek.length },
    { label: "Overdue", value: overdueTasks.length },
    { label: "Blocked", value: blockedProjects.length },
    { label: "Completed", value: completedProjects.length },
  ];

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[22px] font-semibold text-ink">{s.value}</p>
            <p className="mt-0.5 text-[12px] text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Priority projects */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Priority Projects"
            action={
              <Link href="/projects" className="text-[12px] font-medium text-signal hover:underline">
                View all
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {priorityProjects.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-muted">
                No active projects yet. Capture your first idea to get started.
              </p>
            )}
            {priorityProjects.map((p) => {
              const pm = PRIORITY_META[p.priority];
              const sm = PROJECT_STATUS_META[p.status];
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block px-4 py-3 hover:bg-canvas"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Dot className={pm.dot} />
                      <span className="text-[13px] font-medium text-ink">{p.name}</span>
                      <Badge soft={sm.soft} text={sm.text}>{sm.label}</Badge>
                    </div>
                    <span className="text-[12px] text-muted">{dueLabel(p.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={p.progress} className="max-w-[220px]" />
                    <span className="text-[12px] text-muted">{p.progress}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Team workload */}
        <Card>
          <CardHeader title="Team Workload" />
          <div className="space-y-3 p-4">
            {workload.map(({ user, score, openTasks }) => (
              <div key={user.id}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name={user.name} color={user.avatarColor} size={20} />
                    <span className="text-[13px] text-ink">{user.name}</span>
                  </div>
                  <span className="text-[12px] text-muted">{openTasks} open</span>
                </div>
                <ProgressBar
                  value={score}
                  barClassName={score > 70 ? "bg-critical" : score > 40 ? "bg-warning" : "bg-success"}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming deadlines */}
        <Card>
          <CardHeader title="Upcoming Deadlines" />
          <div className="divide-y divide-line">
            {upcoming.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-muted">Nothing scheduled.</p>
            )}
            {upcoming.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 truncate">
                  <Clock size={13} className="shrink-0 text-muted" />
                  <span className="truncate text-[13px] text-ink">{t.title}</span>
                </div>
                <span className="shrink-0 text-[12px] text-muted">{formatDate(t.dueDate)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Blocked items */}
        <Card>
          <CardHeader title="Blocked Items" />
          <div className="divide-y divide-line">
            {blockedProjects.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-muted">Nothing blocked right now.</p>
            )}
            {blockedProjects.map((p) => (
              <div key={p.id} className="flex items-start gap-2.5 px-4 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-critical" />
                <div>
                  <p className="text-[13px] font-medium text-ink">{p.name}</p>
                  <p className="text-[12px] text-muted">{p.blockedReason ?? "No reason logged"}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader title="Recent Activity" />
          <div className="divide-y divide-line">
            {recentActivity.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-muted">No activity yet.</p>
            )}
            {recentActivity.map((a) => (
              <div key={a.id} className="px-4 py-2.5">
                <p className="text-[13px] text-ink">{a.message}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {a.projectName ?? "—"} · {a.actorName ?? "System"} · {formatDate(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
