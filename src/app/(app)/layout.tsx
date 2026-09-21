import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // The JWT itself only proves who they were when they logged in — it
  // doesn't know if they've since been deactivated. Checking the live
  // status here (a real server component, not the edge middleware) means
  // a deactivated person is cut off on their very next page load, not
  // whenever their 30-day session cookie happens to expire. We can't
  // clear the cookie itself here (Server Components can't mutate cookies
  // — only Route Handlers, Server Actions, and middleware can), but the
  // redirect alone is enough: every future page load re-runs this same
  // check and bounces them straight back.
  const [user] = await db.select({ status: users.status }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.status !== "active") {
    redirect("/login?deactivated=1");
  }

  return <AppShell user={session}>{children}</AppShell>;
}