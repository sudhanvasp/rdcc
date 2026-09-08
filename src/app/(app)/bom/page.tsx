import { db } from "@/db";
import { quotes, quoteItems } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { QuotesClient } from "@/components/quotes/QuotesClient";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const rows = await db
    .select({
      id: quotes.id,
      title: quotes.title,
      clientName: quotes.clientName,
      status: quotes.status,
      convertedProjectId: quotes.convertedProjectId,
      updatedAt: quotes.updatedAt,
      totalCost: sql<number>`coalesce(sum(${quoteItems.quantity} * ${quoteItems.unitCost}), 0)::float`,
      itemCount: sql<number>`count(${quoteItems.id})::int`,
    })
    .from(quotes)
    .leftJoin(quoteItems, eq(quoteItems.quoteId, quotes.id))
    .groupBy(quotes.id)
    .orderBy(desc(quotes.updatedAt));

  return <QuotesClient initialQuotes={rows} />;
}
