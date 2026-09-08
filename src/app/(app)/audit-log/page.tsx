import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  role_changed: "changed a role",
  project_deleted: "deleted a project",
  workspace_updated: "updated workspace settings",
  subscription_created: "added a subscription",
  subscription_updated: "edited a subscription",
  subscription_deleted: "removed a subscription",
};

export default async function AuditLogPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/dashboard");

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(200);

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        Structural and financial changes only — role changes, project deletions, workspace
        settings, and billing. Routine day-to-day edits aren&rsquo;t logged here.
      </p>
      <Card>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <History size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">Nothing logged yet</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <p className="text-[13px] text-ink">
                  <span className="font-medium">{r.actorName ?? "System"}</span>{" "}
                  {ACTION_LABEL[r.action] ?? r.action}
                </p>
                {!!(r.oldValue || r.newValue) && (
                  <p className="mt-0.5 font-mono text-[11.5px] text-muted">
                    {r.oldValue ? `from ${JSON.stringify(r.oldValue)} ` : ""}
                    {r.newValue ? `to ${JSON.stringify(r.newValue)}` : ""}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-muted">{formatDate(r.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
