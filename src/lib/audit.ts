import { db } from "@/db";
import { auditLogs } from "@/db/schema";

// Tamper-evident record of structural/financial changes — who did what,
// and what changed. Deliberately narrow: this logs the sensitive stuff
// (roles, deletions, money, workspace config), not every routine edit.
export async function logAudit(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await db.insert(auditLogs).values(params);
}
