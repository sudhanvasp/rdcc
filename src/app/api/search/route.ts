import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ideas, projects, tasks, users } from "@/db/schema";
import { ilike, or, and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ results: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = `%${q}%`;

  const [matchedProjects, matchedIdeas, matchedTasks, matchedUsers] =
    await Promise.all([
      db
        .select({ id: projects.id, label: projects.name })
        .from(projects)
        .where(or(ilike(projects.name, like), ilike(projects.description, like)))
        .limit(6),
      db
        .select({ id: ideas.id, label: ideas.title })
        .from(ideas)
        .where(or(ilike(ideas.title, like), ilike(ideas.description, like)))
        .limit(6),
      db
        .select({ id: tasks.id, label: tasks.title, projectId: tasks.projectId })
        .from(tasks)
        .where(ilike(tasks.title, like))
        .limit(6),
      db
        .select({ id: users.id, label: users.name })
        .from(users)
        .where(and(ilike(users.name, like), eq(users.status, "active")))
        .limit(4),
    ]);

  const results = [
    ...matchedProjects.map((p) => ({
      type: "project" as const,
      id: p.id,
      label: p.label,
      href: `/projects/${p.id}`,
    })),
    ...matchedIdeas.map((i) => ({
      type: "idea" as const,
      id: i.id,
      label: i.label,
      href: `/ideas`,
    })),
    ...matchedTasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      label: t.label,
      href: `/projects/${t.projectId}?tab=tasks`,
    })),
    ...matchedUsers.map((u) => ({
      type: "person" as const,
      id: u.id,
      label: u.label,
      href: `/team`,
    })),
  ];

  return NextResponse.json({ results });
}
