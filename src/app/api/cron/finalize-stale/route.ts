import { NextRequest, NextResponse } from "next/server";
import { finalizeStaleConversations } from "@/lib/whatsapp-flow";
import { prepareDigests } from "@/lib/digest";
import { checkTaskDeadlineNotifications } from "@/lib/deadline-notifications";
import { checkRenewalReminders } from "@/lib/billing-reminders";
import { sendWeeklyReportIfDue } from "@/lib/weekly-report";
import { checkEventReminders } from "@/lib/event-reminders";

// Deliberately NOT using Vercel's own Cron feature here \u2014 the free Hobby
// tier only allows once-per-day schedules, which is useless for a 10-minute
// timeout. Instead, an external free scheduler (e.g. cron-job.org) hits this
// route every few minutes. Protected by a shared secret so randoms on the
// internet can't trigger it. Also runs the email digest check \u2014 it's
// internally rate-limited to ~once/day per user, so calling it every few
// minutes here is harmless.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await finalizeStaleConversations();
    await prepareDigests();
    await checkTaskDeadlineNotifications();
    await checkRenewalReminders();
    await sendWeeklyReportIfDue();
    await checkEventReminders();
  } catch (err) {
    console.error("Cron job failed:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
