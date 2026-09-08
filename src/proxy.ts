import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "rdcc_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-secret-do-not-use-in-production"
);

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/whatsapp/webhook", "/api/cron/finalize-stale"];

// ---------------------------------------------------------------------------
// Basic rate limiting — in-memory, per-process. Good enough protection for
// a single-instance deployment; a multi-region/serverless setup would need
// a shared store (Redis) instead, since each instance has its own memory.
// ---------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// Prevent unbounded memory growth from stale IPs.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60 * 1000);

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);

  // Login: 10 attempts per 15 minutes per IP — slows down password guessing
  // without locking out a real user who just fat-fingered their password.
  if (pathname === "/api/auth/login") {
    if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many login attempts. Try again in a few minutes." }, { status: 429 });
    }
  }

  // Registration: 5 attempts per hour per IP — this is a public,
  // unauthenticated endpoint, so it needs its own guard against spam.
  if (pathname === "/api/auth/register") {
    if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
    }
  }

  // General API traffic: 120 requests/minute per IP. Generous for normal
  // use (including the AI chat and dashboard polling), tight enough to
  // blunt scripted abuse.
  if (pathname.startsWith("/api") && pathname !== "/api/whatsapp/webhook") {
    if (!rateLimit(`api:${ip}`, 120, 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
    }
  }

  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = token ? await verify(token) : false;

  if (!valid) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function verify(token: string) {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
