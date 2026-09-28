import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectVersions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { fromBase64, cleanText } from "@/lib/text-transport";
import { z } from "zod";

const schema = z.object({
  projectId: z.string().min(1),
  label: z.string().min(1),
  changes: z.string().optional(),
  code: z.string().optional(),
  language: z.string().optional(),
  // When true, `changes` and `code` arrive base64-encoded (the Versions tab
  // does this so pasted code can't trip a hosting firewall). Plain text is
  // still accepted so nothing else that calls this route breaks.
  encoded: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "You're logged out — please log in again." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { encoded, changes, code, ...rest } = parsed.data;
  const read = (value: string) => cleanText(encoded ? fromBase64(value) : value);

  try {
    const [created] = await db
      .insert(projectVersions)
      .values({
        ...rest,
        label: cleanText(rest.label),
        changes: changes === undefined ? undefined : read(changes),
        code: code === undefined ? undefined : read(code),
        createdById: session.userId,
      })
      .returning();

    return NextResponse.json({ version: created }, { status: 201 });
  } catch (err) {
    console.error("Failed to log project version:", err);
    return NextResponse.json(
      { error: "The server couldn't save that version (database error). See the runtime logs for details." },
      { status: 500 }
    );
  }
}