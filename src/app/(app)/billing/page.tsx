import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BillingClient } from "@/components/billing/BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/dashboard");

  const rows = await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  return <BillingClient initialSubscriptions={rows} />;
}
