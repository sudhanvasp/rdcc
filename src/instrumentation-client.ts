import * as Sentry from "@sentry/nextjs";

// Client-side DSN must be NEXT_PUBLIC_-prefixed to reach the browser bundle.
// A Sentry DSN is designed to be public (it's a write-only ingest address,
// not a secret credential) — this is Sentry's own documented pattern.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
