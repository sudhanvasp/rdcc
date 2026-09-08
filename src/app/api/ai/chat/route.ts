import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { askAI, AIConfigError, type ChatMessage } from "@/lib/ai";
import { buildWorkspaceDigest } from "@/lib/ai-context";
import { z } from "zod";

const SYSTEM_PROMPT = `You are the AI assistant built into an R&D team's internal management tool (projects, tasks, ideas, BOM, team workload).

Rules:
- Answer questions about the team's projects, tasks, ideas, team, and BOM spend using ONLY the workspace data provided below. Never invent project names, numbers, dates, or people that aren't in the data.
- If something isn't covered by the data, say plainly that you don't have that information — don't guess.
- For general engineering/technical questions unrelated to their internal data (e.g. "how does a laser diode work"), you may answer from general knowledge, but make clear when you're doing so vs. reporting their actual data.
- Keep answers concise and direct — this is a busy technical person, not a chatbot that needs to be entertaining.`;

const schema = z.object({
  message: z.string().min(1),
  conversationId: z.string().nullable().optional(),
});

// Load (or lazily create) the current user's single running conversation.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [existing] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.userId, session.userId), eq(aiConversations.channel, "web")))
    .orderBy(asc(aiConversations.createdAt));

  if (!existing) return NextResponse.json({ conversationId: null, messages: [] });

  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, existing.id))
    .orderBy(asc(aiMessages.createdAt));

  return NextResponse.json({ conversationId: existing.id, messages });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  let conversationId = parsed.data.conversationId;
  if (!conversationId) {
    const [conv] = await db
      .insert(aiConversations)
      .values({ userId: session.userId, channel: "web" })
      .returning();
    conversationId = conv.id;
  }

  const history = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt));

  const digest = await buildWorkspaceDigest();

  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nWORKSPACE DATA (current, live):\n${digest}` },
    ...history.map((h): ChatMessage => ({ role: h.role, content: h.content })),
    { role: "user", content: parsed.data.message },
  ];

  await db.insert(aiMessages).values({ conversationId, role: "user", content: parsed.data.message });

  let reply: string;
  try {
    reply = await askAI(messages);
  } catch (err) {
    const message =
      err instanceof AIConfigError
        ? err.message
        : `The AI request failed: ${err instanceof Error ? err.message : "unknown error"}`;
    return NextResponse.json({ error: message, conversationId }, { status: err instanceof AIConfigError ? 503 : 502 });
  }

  await db.insert(aiMessages).values({ conversationId, role: "assistant", content: reply });

  return NextResponse.json({ conversationId, reply });
}
