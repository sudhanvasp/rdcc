import { db } from "@/db";
import { users, ideas, whatsappConversationState } from "@/db/schema";
import { eq, desc, and, ne, lt } from "drizzle-orm";
import { sendText, sendButtons, sendList, type IncomingMessage } from "./whatsapp";
import { notify } from "./notify";

// Outbound sends are best-effort from the flow's point of view \u2014 a failed
// WhatsApp API call (rate limit, brief outage, missing credentials) must
// never block a state transition or leave the conversation stuck.
async function safeSendText(...args: Parameters<typeof sendText>) {
  try {
    await sendText(...args);
  } catch (err) {
    console.error("WhatsApp send (text) failed:", err);
  }
}
async function safeSendButtons(...args: Parameters<typeof sendButtons>) {
  try {
    await sendButtons(...args);
  } catch (err) {
    console.error("WhatsApp send (buttons) failed:", err);
  }
}
async function safeSendList(...args: Parameters<typeof sendList>) {
  try {
    await sendList(...args);
  } catch (err) {
    console.error("WhatsApp send (list) failed:", err);
  }
}

const DURATION_DAYS: Record<string, number> = {
  duration_short: 2,
  duration_medium: 5,
  duration_long: 10,
};
const DURATION_LABEL: Record<string, string> = {
  duration_short: "1-3 days",
  duration_medium: "4-7 days",
  duration_long: "1+ week",
};

async function getState(phone: string) {
  const [state] = await db
    .select()
    .from(whatsappConversationState)
    .where(eq(whatsappConversationState.phoneNumber, phone))
    .orderBy(desc(whatsappConversationState.createdAt))
    .limit(1);
  return state ?? null;
}

async function updateState(id: string, patch: { currentQuestion?: string; temporaryData?: Record<string, unknown> }) {
  const [current] = await db.select().from(whatsappConversationState).where(eq(whatsappConversationState.id, id)).limit(1);
  const mergedData = { ...(current?.temporaryData as Record<string, unknown> | null), ...(patch.temporaryData ?? {}) };
  await db
    .update(whatsappConversationState)
    .set({ currentQuestion: patch.currentQuestion, temporaryData: mergedData, updatedAt: new Date() })
    .where(eq(whatsappConversationState.id, id));
  return mergedData;
}

async function clearState(id: string) {
  await db.delete(whatsappConversationState).where(eq(whatsappConversationState.id, id));
}

// Shared by both the normal "confirm" step and the inactivity auto-finalize
// path below \u2014 creates the idea from whatever fields were actually
// collected, defaulting anything missing rather than requiring it.
async function createIdeaFromData(userId: string, data: Record<string, any>, source: "whatsapp" | "whatsapp_timeout") {
  const [created] = await db
    .insert(ideas)
    .values({
      title: data.title,
      priority: data.priority ?? "medium",
      assigneeId: data.ownerId ?? undefined,
      estimatedDurationDays: data.estimatedDurationDays ?? undefined,
      notes: data.notes ?? undefined,
      creatorId: userId,
      source,
    })
    .returning();

  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), ne(users.id, userId)));
  await Promise.all(
    admins.map((a) =>
      notify({ userId: a.id, type: "idea_created", title: "New idea captured (WhatsApp)", body: created.title })
    )
  );

  return created;
}

// Called periodically (see src/instrumentation.ts). Any WhatsApp idea-capture
// conversation that's gone quiet for 10+ minutes gets finalized with
// whatever was collected so far, instead of leaving the person stuck if
// they wander off mid-flow.
const STALE_AFTER_MS = 10 * 60 * 1000;

export async function finalizeStaleConversations() {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const stale = await db
    .select()
    .from(whatsappConversationState)
    .where(lt(whatsappConversationState.updatedAt, cutoff));

  for (const state of stale) {
    const data = (state.temporaryData as Record<string, any>) ?? {};
    if (!data.title || !state.userId) {
      await clearState(state.id);
      continue;
    }
    try {
      const created = await createIdeaFromData(state.userId, data, "whatsapp_timeout");
      await safeSendText(
        state.phoneNumber,
        `You went quiet for a bit, so I created "${created.title}" with what you'd told me so far. Open it in Ideas to fill in anything else.`
      );
    } catch (err) {
      console.error("Failed to auto-finalize stale WhatsApp conversation:", err);
    } finally {
      await clearState(state.id);
    }
  }
}

export async function handleIncomingMessage(from: string, incoming: IncomingMessage) {
  const [user] = await db.select().from(users).where(eq(users.phone, from)).limit(1);
  if (!user) {
    await safeSendText(
      from,
      "This number isn't linked to a Team account yet. Ask an admin to add it under Team -> edit member -> WhatsApp number."
    );
    return;
  }

  const state = await getState(from);

  if (!state) {
    const text = incoming.text.trim();
    if (text.toLowerCase() === "help") {
      await safeSendText(from, 'Text me an idea title (e.g. "Laser harp") and I\'ll walk you through capturing it.');
      return;
    }
    await startIdeaCapture(from, user.id, text);
    return;
  }

  await continueIdeaCapture(from, user.id, user.role, state, incoming);
}

async function startIdeaCapture(phone: string, userId: string, title: string) {
  await db.insert(whatsappConversationState).values({
    phoneNumber: phone,
    userId,
    currentFlow: "create_idea",
    currentQuestion: "priority",
    temporaryData: { title },
  });
  await safeSendButtons(phone, `NEW IDEA: ${title}\n\nPriority?`, [
    { id: "priority_high", title: "High" },
    { id: "priority_medium", title: "Medium" },
    { id: "priority_low", title: "Low" },
  ]);
}

async function continueIdeaCapture(
  phone: string,
  userId: string,
  role: "admin" | "member",
  state: typeof whatsappConversationState.$inferSelect,
  incoming: IncomingMessage
) {
  const question = state.currentQuestion;

  if (question === "priority") {
    const priority = incoming.replyId?.replace("priority_", "") ?? "medium";

    // Only an admin gets to decide who works on it \u2014 a regular member
    // texting the bot shouldn't be able to hand work to someone else.
    if (role !== "admin") {
      await updateState(state.id, {
        currentQuestion: "duration",
        temporaryData: { priority, ownerId: null, ownerName: "Unassigned" },
      });
      await safeSendButtons(phone, 'Estimated duration? (or reply "skip")', [
        { id: "duration_short", title: "1-3 days" },
        { id: "duration_medium", title: "4-7 days" },
        { id: "duration_long", title: "1+ week" },
      ]);
      return;
    }

    const members = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.status, "active"));
    await updateState(state.id, { currentQuestion: "owner", temporaryData: { priority } });
    await safeSendList(phone, "Who should work on it?", "Choose owner", [
      { id: "unassigned", title: "Unassigned" },
      ...members.map((m) => ({ id: m.id, title: m.name })),
    ]);
    return;
  }

  if (question === "owner") {
    const ownerId = incoming.replyId && incoming.replyId !== "unassigned" ? incoming.replyId : null;
    const ownerName = incoming.text;
    await updateState(state.id, { currentQuestion: "duration", temporaryData: { ownerId, ownerName } });
    await safeSendButtons(phone, 'Estimated duration? (or reply "skip")', [
      { id: "duration_short", title: "1-3 days" },
      { id: "duration_medium", title: "4-7 days" },
      { id: "duration_long", title: "1+ week" },
    ]);
    return;
  }

  if (question === "duration") {
    const skipped = !incoming.replyId && incoming.text.trim().toLowerCase() === "skip";
    const days = skipped ? null : (DURATION_DAYS[incoming.replyId ?? "duration_medium"] ?? 5);
    await updateState(state.id, { currentQuestion: "notes", temporaryData: { estimatedDurationDays: days } });
    await safeSendText(phone, 'Any additional notes? Reply with notes, or type "skip".');
    return;
  }

  if (question === "notes") {
    const notes = incoming.text.trim().toLowerCase() === "skip" ? null : incoming.text.trim();
    const data = await updateState(state.id, { currentQuestion: "confirm", temporaryData: { notes } });
    const durationKey = Object.keys(DURATION_DAYS).find((k) => DURATION_DAYS[k] === data.estimatedDurationDays);
    const summary = [
      `${data.title}`,
      `Priority: ${data.priority}`,
      `Owner: ${data.ownerName ?? "Unassigned"}`,
      `Duration: ${durationKey ? DURATION_LABEL[durationKey] : "Not specified"}`,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    await safeSendButtons(phone, `Here's what I have:\n\n${summary}\n\nCreate this idea?`, [
      { id: "confirm_create", title: "Create" },
      { id: "confirm_cancel", title: "Cancel" },
    ]);
    return;
  }

  if (question === "confirm") {
    if (incoming.replyId === "confirm_create") {
      const data = state.temporaryData as Record<string, any>;
      const created = await createIdeaFromData(userId, data, "whatsapp");
      await safeSendText(phone, `Created: "${created.title}". You'll find it in Ideas.`);
    } else {
      await safeSendText(phone, "Cancelled - nothing was created.");
    }
    await clearState(state.id);
    return;
  }
}
