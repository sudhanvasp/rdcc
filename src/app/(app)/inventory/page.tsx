import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { desc } from "drizzle-orm";
import { InventoryClient } from "@/components/inventory/InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const items = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
  return <InventoryClient initialItems={items} />;
}
