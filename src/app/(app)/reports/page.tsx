import { db } from "@/db";
import { projects, tasks, ideas, activities, users, bomItems } from "@/db/schema";
import { and, gte, lte, ne, sql, eq } from "drizzle-orm";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { subDays } from "date-fns";
import { GenerateReportButton } from "@/components/reports/GenerateReportButton";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getSession();
  const since = subDays(new Date(), 7);

  const [
    allProjects,
    allTasks,
    allIdeas,
    weekActivity,
    allUsers,
    allBom,
  ] = await Promise.all([
    db.select().from(projects),
    db.select().from(tasks),
    db.select().from(ideas),
    db.select().from(activities).where(gte(activities.createdAt, since)),
    db.select().from(users).where(eq(users.status, "active")),
    db.select().from(bomItems),
  ]);

  const projectsCompletedThisWeek = allProjects.filter(
    (p) => p.status === "completed" && p.updatedAt >= since
  );
  const projectsStartedThisWeek = allProjects.filter((p) => p.createdAt >= since);
  const ideasCreatedThisWeek = allIdeas.filter((i) => i.createdAt >= since);
  const tasksCompletedThisWeek = allTasks.filter(
    (t) => t.status === "done" && t.updatedAt >= since
  );
  const blockedProjects = allProjects.filter((p) => p.status === "blocked");
  const bomSpend = allBom.reduce((sum, b) => sum + (b.unitCost ?? 0) * b.quantity, 0);
  const bomSpendThisWeek = allBom
    .filter((b) => b.createdAt >= since)
    .reduce((sum, b) => sum + (b.unitCost ?? 0) * b.quantity, 0);

  const workload = allUsers.map((u) => {
    const open = allTasks.filter((t) => t.assigneeId === u.id && t.status !== "done").length;
    return { name: u.name, open };
  });

  const stats = [
    { label: "Projects Completed", value: projectsCompletedThisWeek.length },
    { label: "Projects Started", value: projectsStartedThisWeek.length },
    { label: "Ideas Created", value: ideasCreatedThisWeek.length },
    { label: "Tasks Completed", value: tasksCompletedThisWeek.length },
    { label: "Currently Blocked", value: blockedProjects.length },
    { label: "BOM Spend (7d)", value: `₹${bomSpendThisWeek.toLocaleString("en-IN")}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-medium text-ink">Weekly R&D Report</h2>
          <p className="text-[12px] text-muted">
            {formatDate(since)} — {formatDate(new Date())}
          </p>
        </div>
        {session?.role === "admin" && <GenerateReportButton />}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[20px] font-semibold text-ink">{s.value}</p>
            <p className="mt-0.5 text-[12px] text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Blockers" />
          <div className="divide-y divide-line">
            {blockedProjects.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-muted">Nothing blocked this week.</p>
            )}
            {blockedProjects.map((p) => (
              <div key={p.id} className="px-4 py-2.5">
                <p className="text-[13px] text-ink">{p.name}</p>
                <p className="text-[12px] text-muted">{p.blockedReason ?? "No reason logged"}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Team Workload" />
          <div className="divide-y divide-line">
            {workload.map((w) => (
              <div key={w.name} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-ink">{w.name}</span>
                <span className="text-[12px] text-muted">{w.open} open tasks</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Activity This Week" />
        <div className="divide-y divide-line">
          {weekActivity.length === 0 && (
            <p className="px-4 py-6 text-[13px] text-muted">No activity logged this week.</p>
          )}
          {weekActivity.slice(0, 20).map((a) => (
            <div key={a.id} className="px-4 py-2.5">
              <p className="text-[13px] text-ink">{a.message}</p>
              <p className="text-[12px] text-muted">{formatDate(a.createdAt)}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-[12px] text-muted">
        Total BOM spend across all projects to date: <span className="font-medium text-ink">₹{bomSpend.toLocaleString("en-IN")}</span>.
        AI-generated summaries of this report arrive in Phase 3.
      </p>
    </div>
  );
}
