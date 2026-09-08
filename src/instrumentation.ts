// Runs once when the Next.js server process starts (not per-request). This
// is where we: (1) initialize Sentry error monitoring for whichever runtime
// this process is, and (2) start background checks \u2014 WhatsApp conversations
// that went quiet mid-flow, the once-a-day email digest, and deadline
// notifications. All of these are no-ops if their required env vars aren't set.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Guard against Next.js dev-mode reloading this module more than once
  // and starting duplicate timers.
  const g = globalThis as unknown as { __rdccTimer?: NodeJS.Timeout };
  if (g.__rdccTimer) return;

  const { finalizeStaleConversations } = await import("./lib/whatsapp-flow");
  const { prepareDigests } = await import("./lib/digest");
  const { checkTaskDeadlineNotifications } = await import("./lib/deadline-notifications");
  const { checkRenewalReminders } = await import("./lib/billing-reminders");
  const { sendWeeklyReportIfDue } = await import("./lib/weekly-report");
  const { checkEventReminders } = await import("./lib/event-reminders");

  g.__rdccTimer = setInterval(() => {
    finalizeStaleConversations().catch((err) => {
      console.error("finalizeStaleConversations failed:", err);
    });
    prepareDigests().catch((err) => {
      console.error("prepareDigests failed:", err);
    });
    checkTaskDeadlineNotifications().catch((err) => {
      console.error("checkTaskDeadlineNotifications failed:", err);
    });
    checkRenewalReminders().catch((err) => {
      console.error("checkRenewalReminders failed:", err);
    });
    sendWeeklyReportIfDue().catch((err) => {
      console.error("sendWeeklyReportIfDue failed:", err);
    });
    checkEventReminders().catch((err) => {
      console.error("checkEventReminders failed:", err);
    });
  }, 60 * 1000);
}

export async function onRequestError(...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
