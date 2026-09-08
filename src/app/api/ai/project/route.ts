import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { askAI, AIConfigError } from "@/lib/ai";
import { buildProjectContext } from "@/lib/ai-context";
import { z } from "zod";

const ACTIONS = {
  summarize: {
    label: "Summarize project",
    instruction: "Summarize this project's current status in 3-4 sentences for a busy manager who hasn't looked at it in a week.",
  },
  next_steps: {
    label: "Suggest next steps",
    instruction: "Based on the current tasks and status, suggest the 3-5 most important next steps, in priority order. Format as a short numbered list.",
  },
  risks: {
    label: "Identify risks",
    instruction: "Identify potential risks or blockers for this project based on its current state — things that could delay or derail it. Format as a short bulleted list. If nothing stands out, say so plainly.",
  },
} as const;

const schema = z.object({
  projectId: z.string().min(1),
  action: z.enum(["summarize", "next_steps", "risks"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const context = await buildProjectContext(parsed.data.projectId);
  if (!context) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const action = ACTIONS[parsed.data.action];

  let reply: string;
  try {
    reply = await askAI([
      {
        role: "system",
        content:
          "You are an R&D project copilot. Answer using ONLY the project data given — never invent tasks, dates, or details not present in it.",
      },
      { role: "user", content: `${action.instruction}\n\nPROJECT DATA:\n${context}` },
    ]);
  } catch (err) {
    const message =
      err instanceof AIConfigError
        ? err.message
        : `The AI request failed: ${err instanceof Error ? err.message : "unknown error"}`;
    return NextResponse.json({ error: message }, { status: err instanceof AIConfigError ? 503 : 502 });
  }

  await db.insert(activities).values({
    projectId: parsed.data.projectId,
    actorId: session.userId,
    type: "ai_generated",
    message: `AI generated: ${action.label}`,
  });

  return NextResponse.json({ reply, action: parsed.data.action });
}
