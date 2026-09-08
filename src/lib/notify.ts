import { db } from "@/db";
import { notifications } from "@/db/schema";

export async function notify(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  relatedProjectId?: string;
  relatedTaskId?: string;
}) {
  await db.insert(notifications).values(params);
}
