import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, isEmailConfigured, EmailConfigError } from "./email";
import { generateWorkReport } from "./work-report";
import { ymdInZone } from "./work-report-model";

// Checks the workspace's own timezone to fire specifically on Saturday
// evening (5-9pm local), rather than "every 7 days since last sent" which
// drifts to whatever day the server happened to be running on.
function isSaturdayEvening(timezone: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    return weekday === "Sat" && hour >= 17 && hour < 21;
  } catch {
    return false;
  }
}

const MIN_HOURS_BETWEEN_REPORTS = 20;

export async function sendWeeklyReportIfDue() {
  if (!isEmailConfigured()) return;

  const [ws] = await db.select().from(workspaces).limit(1);
  if (!ws) return;
  if (!isSaturdayEvening(ws.timezone)) return;

  const lastSent = ws.lastWeeklyReportSentAt;
  if (lastSent && Date.now() - lastSent.getTime() < MIN_HOURS_BETWEEN_REPORTS * 60 * 60 * 1000) return;

  const admins = await db.select().from(users).where(eq(users.role, "admin"));
  if (admins.length === 0) return;

  // Last 7 days including today, as calendar days in the workspace timezone.
  const todayYmd = ymdInZone(new Date(), ws.timezone);
  const fromYmd = ymdInZone(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), ws.timezone);
  const { buffer } = await generateWorkReport({
    fromYmd,
    toYmd: todayYmd,
    preparedBy: `${ws.name} (automatic weekly report)`,
  });

  for (const admin of admins) {
    try {
      await sendEmail(
        admin.email,
        "Your Weekly R&D Report",
        `<div style="font-family: sans-serif;"><p>Your weekly R&D work report is attached (Word document).</p></div>`,
        [{ filename: `Weekly_Work_Report_${todayYmd}.docx`, content: buffer }]
      );
    } catch (err) {
      if (!(err instanceof EmailConfigError)) {
        console.error(`Failed to send weekly report to ${admin.email}:`, err);
      }
      return;
    }
  }

  await db.update(workspaces).set({ lastWeeklyReportSentAt: new Date() }).where(eq(workspaces.id, ws.id));
}