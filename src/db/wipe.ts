import "dotenv/config";
import { db } from "./index";
import {
  projects, ideas, quotes, checklists, tags, inventoryItems, subscriptions,
  notifications, auditLogs, aiConversations, integrations, whatsappConversationState,
  notes, files, activities, comments,
} from "./schema";

// Wipes all WORK data (projects, tasks, ideas, BOM, quotes, checklists, etc.)
// but keeps user accounts and workspace settings intact, so nobody gets
// locked out. Run this once before real production use, after demo/seed
// data has served its purpose.
async function main() {
  if (process.argv[2] !== "--confirm") {
    console.log("This will PERMANENTLY delete all projects, tasks, ideas, BOM,");
    console.log("quotes, checklists, tags, inventory, subscriptions, and");
    console.log("notifications — but keeps user accounts and workspace settings.");
    console.log("");
    console.log("Run again with --confirm to actually do it:");
    console.log("  npm run db:wipe -- --confirm");
    process.exit(0);
  }

  console.log("Wiping work data...");

  // Deleting projects/ideas/quotes/checklists cascades to almost everything
  // that references them (tasks, BOM, experiments, links, versions, comments,
  // activities, quote items, checklist items).
  await db.delete(projects);
  await db.delete(ideas);
  await db.delete(quotes);
  await db.delete(checklists);
  await db.delete(tags);
  await db.delete(inventoryItems);
  await db.delete(subscriptions);
  await db.delete(notifications);
  await db.delete(auditLogs);
  await db.delete(aiConversations);
  await db.delete(integrations);
  await db.delete(whatsappConversationState);
  // Defensive cleanup of anything that could be left orphaned.
  await db.delete(notes);
  await db.delete(files);
  await db.delete(activities);
  await db.delete(comments);

  console.log("Done. User accounts and workspace settings were left untouched.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
