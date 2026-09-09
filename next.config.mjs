import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

// Wrapping is safe even with no Sentry env vars set — it just adds an
// upload step for source maps, which itself no-ops without SENTRY_AUTH_TOKEN.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
