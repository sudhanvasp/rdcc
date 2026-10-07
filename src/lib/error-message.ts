// Drizzle wraps database errors as "Failed query: <the SQL>" and keeps the
// real reason (e.g. `relation "x" does not exist`) in `cause`. These helpers
// dig the real reason out so an error message can actually say what's wrong.

export function rootCauseMessage(err: unknown): string {
  let message = err instanceof Error ? err.message : String(err);
  let current: unknown = err;
  for (let depth = 0; depth < 5; depth++) {
    const cause = current instanceof Error ? (current as { cause?: unknown }).cause : undefined;
    if (!cause) break;
    current = cause;
    if (cause instanceof Error && cause.message) message = cause.message;
  }
  return message.split("\n")[0].slice(0, 200);
}

// A plain-language next step for the two database problems that come up when
// deploying: the database is behind the code, or the app can't reach it.
export function dbHint(message: string): string {
  if (/(relation|column|type) ".+" does not exist|invalid input value for enum/i.test(message)) {
    return "The database looks out of date. Run `npm run db:push` against it.";
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNRESET|timeout|terminating connection|password authentication|SSL/i.test(message)) {
    return "The app can't reach the database. Check that it is running and that DATABASE_URL is correct.";
  }
  return "";
}