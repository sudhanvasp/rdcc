import { db } from "@/db";
import { users, tasks, projects, pendingDigests } from "@/db/schema";
import { eq, ne, or, lt, isNull, and } from "drizzle-orm";
import { isEmailConfigured } from "./email";
import { notify } from "./notify";
import { formatDate } from "./utils";

const MIN_HOURS_BETWEEN_DIGESTS = 20;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Prepares (but does NOT send) at most one digest per user per ~20 hours,
// and only if they actually have something pending. Nothing goes out
// automatically — an admin reviews and clicks Send from the Settings page.
export async function prepareDigests() {
  if (!isEmailConfigured()) return;

  const cutoff = new Date(Date.now() - MIN_HOURS_BETWEEN_DIGESTS * 60 * 60 * 1000);
  const candidateUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.status, "active"), or(isNull(users.lastDigestSentAt), lt(users.lastDigestSentAt, cutoff))));

  if (candidateUsers.length === 0) return;

  const now = new Date();
  const [allOpenTasks, allProjects, existingPending] = await Promise.all([
    db.select().from(tasks).where(ne(tasks.status, "done")),
    db.select().from(projects),
    db.select().from(pendingDigests).where(eq(pendingDigests.status, "pending")),
  ]);
  const usersWithPendingDigest = new Set(existingPending.map((d) => d.userId));

  for (const user of candidateUsers) {
    if (usersWithPendingDigest.has(user.id)) continue; // already awaiting review

    const overdueTasks = allOpenTasks.filter(
      (t) => t.assigneeId === user.id && t.dueDate && t.dueDate < now
    );
    const dueSoonTasks = allOpenTasks.filter(
      (t) =>
        t.assigneeId === user.id &&
        t.dueDate &&
        t.dueDate >= now &&
        t.dueDate <= new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    );
    const blockedOwnedProjects = allProjects.filter(
      (p) => p.ownerId === user.id && p.status === "blocked"
    );

    const hasAnything = overdueTasks.length + dueSoonTasks.length + blockedOwnedProjects.length > 0;
    if (!hasAnything) continue;

    const sections: string[] = [];
    if (overdueTasks.length > 0) {
      sections.push(
        `<h3>Overdue (${overdueTasks.length})</h3><ul>` +
          overdueTasks.map((t) => `<li>${escapeHtml(t.title)} — was due ${formatDate(t.dueDate)}</li>`).join("") +
          `</ul>`
      );
    }
    if (dueSoonTasks.length > 0) {
      sections.push(
        `<h3>Due soon (${dueSoonTasks.length})</h3><ul>` +
          dueSoonTasks.map((t) => `<li>${escapeHtml(t.title)} — due ${formatDate(t.dueDate)}</li>`).join("") +
          `</ul>`
      );
    }
    if (blockedOwnedProjects.length > 0) {
      sections.push(
        `<h3>Blocked projects you own (${blockedOwnedProjects.length})</h3><ul>` +
          blockedOwnedProjects.map((p) => `<li>${escapeHtml(p.name)}${p.blockedReason ? ` — ${escapeHtml(p.blockedReason)}` : ""}</li>`).join("") +
          `</ul>`
      );
    }

    const html = `
      <div style="font-family: sans-serif; color: #14171a; max-width: 480px;">
        <h2>You have some pending items</h2>
        ${sections.join("")}
        <p style="color:#6b7280; font-size:13px; margin-top:24px;">
          This is a one-time-a-day summary from R&D Command Center — we won't spam you more than this.
        </p>
      </div>
    `;

    const summaryParts = [
      overdueTasks.length ? `${overdueTasks.length} overdue` : null,
      dueSoonTasks.length ? `${dueSoonTasks.length} due soon` : null,
      blockedOwnedProjects.length ? `${blockedOwnedProjects.length} blocked project(s)` : null,
    ].filter(Boolean);

    const [created] = await db
      .insert(pendingDigests)
      .values({
        userId: user.id,
        recipientName: user.name,
        recipientEmail: user.email,
        subject: "Pending items in R&D Command Center",
        html,
        summary: summaryParts.join(", "),
      })
      .returning();

    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    await Promise.all(
      admins.map((a) =>
        notify({
          userId: a.id,
          type: "digest_pending",
          title: "Digest ready for review",
          body: `${user.name}: ${created.summary}`,
        })
      )
    );
  }
}
