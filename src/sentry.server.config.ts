import * as Sentry from "@sentry/nextjs";

// No-op if SENTRY_DSN isn't set — same graceful-degradation pattern as
// every other optional integration in this app (AI, WhatsApp, email).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
