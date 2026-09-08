import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// A single pooled connection shared across the app. Next.js dev-mode hot
// reload would otherwise create a new pool per reload, so we stash it on
// globalThis in development.
declare global {
  // eslint-disable-next-line no-var
  var __rdccPool: Pool | undefined;
}

// Hosted Postgres (Neon, Supabase, etc.) requires SSL; local Postgres on
// your Mac doesn't have a cert configured at all. Detect which one we're
// talking to instead of hardcoding either way.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "");

const pool =
  global.__rdccPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  global.__rdccPool = pool;
}

export const db = drizzle(pool, { schema });
