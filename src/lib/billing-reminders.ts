import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { and, eq, gte, lte, or, isNull, lt } from "drizzle-orm";
import { notify } from "./notify";
import { sendEmail, isEmailConfigured, EmailConfigError } from "./email";
import { formatDate } from "./utils";

const REMIND_EVERY_HOURS = 24;

// Runs periodically. Notifies every admin (bell + email) about a
// subscription renewing within 2 days, once every 24 hours until it
// actually renews. Tracked on the subscription row itself (lastReminderSentAt)
// — deliberately NOT tracked via the notifications table, because
// "Clear all notifications" would then wipe the dedup marker and cause a
// duplicate reminder on the very next check.
export async function checkRenewalReminders() {
  const now = new Date();
  const soonCutoff = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const remindCutoff = new Date(now.getTime() - REMIND_EVERY_HOURS * 60 * 60 * 1000);

  const dueForReminder = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        gte(subscriptions.renewalDate, now),
        lte(subscriptions.renewalDate, soonCutoff),
        or(isNull(subscriptions.lastReminderSentAt), lt(subscriptions.lastReminderSentAt, remindCutoff))
      )
    );

  if (dueForReminder.length === 0) return;

  const admins = await db.select().from(users).where(eq(users.role, "admin"));

  for (const sub of dueForReminder) {
    const costLabel = `₹${sub.cost.toLocaleString("en-IN")}`;
    const dateLabel = formatDate(sub.renewalDate);
    const title = "Upcoming bill";
    const body = `${sub.name} — ${costLabel} on ${dateLabel}. Don't forget!`;

    for (const admin of admins) {
      await notify({ userId: admin.id, type: "subscription_renewing", title, body });
    }

    if (isEmailConfigured()) {
      const html = `
        <div style="font-family: -apple-system, sans-serif; color: #14171a; max-width: 480px;">
          <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
            Billing
          </p>
          <h2 style="margin: 0 0 16px 0;">You have an upcoming bill — don't forget</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Subscription</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">${sub.name}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e4e1;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Amount</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">${costLabel}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e4e1;">
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Renews on</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">${dateLabel}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            We'll remind you once a day until this renews.
          </p>
        </div>
      `;
      for (const admin of admins) {
        try {
          await sendEmail(admin.email, `Upcoming bill: ${sub.name}`, html);
        } catch (err) {
          if (!(err instanceof EmailConfigError)) {
            console.error(`Failed to send renewal reminder to ${admin.email}:`, err);
          }
        }
      }
    }

    await db.update(subscriptions).set({ lastReminderSentAt: now }).where(eq(subscriptions.id, sub.id));
  }
}
