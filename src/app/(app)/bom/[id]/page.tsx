import { notFound } from "next/navigation";
import { db } from "@/db";
import { quotes, quoteItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { QuoteDetailClient } from "@/components/quotes/QuoteDetailClient";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) notFound();

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, id))
    .orderBy(asc(quoteItems.order), asc(quoteItems.createdAt));

  return <QuoteDetailClient quote={quote} initialItems={items} />;
}
