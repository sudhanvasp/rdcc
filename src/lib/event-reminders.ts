import { db } from "@/db";
import { calendarEvents, users } from "@/db/schema";
import { and, eq, gte, lte, isNull } from "drizzle-orm";
import { notify } from "./notify";
import { sendEmail, isEmailConfigured, EmailConfigError } from "./email";
import { formatDate } from "./utils";

// Runs periodically. Reminds the creator of a calendar event once, roughly
// a day before it happens — e.g. an event on Sept 10 gets a reminder on
// Sept 9. Tracked on the event row itself (reminderSentAt), same pattern as
// billing reminders, so "Clear all notifications" can never cause a repeat.
export async function checkEventReminders() {
  const now = new Date();
  const in18h = new Date(now.getTime() + 18 * 60 * 60 * 1000);
  const in36h = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const dueForReminder = await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        gte(calendarEvents.date, in18h),
        lte(calendarEvents.date, in36h),
        isNull(calendarEvents.reminderSentAt)
      )
    );

  if (dueForReminder.length === 0) return;

  for (const event of dueForReminder) {
    const [creator] = await db.select().from(users).where(eq(users.id, event.createdById)).limit(1);
    if (!creator) {
      await db.update(calendarEvents).set({ reminderSentAt: now }).where(eq(calendarEvents.id, event.id));
      continue;
    }

    await notify({
      userId: creator.id,
      type: "event_reminder",
      title: "Upcoming event tomorrow",
      body: `${event.title} — ${formatDate(event.date)}`,
    });

    if (isEmailConfigured()) {
      try {
        await sendEmail(
          creator.email,
          `Reminder: ${event.title} tomorrow`,
          `<div style="font-family: -apple-system, sans-serif; color: #14171a; max-width: 480px;">
            <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
              Calendar
            </p>
            <h2 style="margin: 0 0 16px 0;">You have an upcoming event tomorrow</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Event</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${event.title}</td>
              </tr>
              <tr style="border-top: 1px solid #e2e4e1;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Date</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formatDate(event.date)}</td>
              </tr>
            </table>
          </div>`
        );
      } catch (err) {
        if (!(err instanceof EmailConfigError)) {
          console.error(`Failed to send event reminder to ${creator.email}:`, err);
        }
      }
    }

    await db.update(calendarEvents).set({ reminderSentAt: now }).where(eq(calendarEvents.id, event.id));
  }
}
