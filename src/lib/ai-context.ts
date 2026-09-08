import { db } from "@/db";
import { projects, tasks, ideas, users, bomItems } from "@/db/schema";
import { ne, eq } from "drizzle-orm";

// Builds a compact, factual text digest of the whole workspace. This is fed
// to the model as ground truth — the system prompt instructs it to answer
// only from this data, never to invent project names, numbers, or people
// (spec section 30: search DB first, answer from retrieved records).
export async function buildWorkspaceDigest(): Promise<string> {
  const [allProjects, openTasks, allIdeas, allUsers, allBom] = await Promise.all([
    db.select().from(projects),
    db.select().from(tasks).where(ne(tasks.status, "done")),
    db.select().from(ideas),
    db.select().from(users).where(eq(users.status, "active")),
    db.select().from(bomItems),
  ]);

  const lines: string[] = [];
  const fmt = (d: Date | null) => (d ? new Date(d).toDateString() : "none");

  lines.push("=== PROJECTS ===");
  for (const p of allProjects) {
    const projectTasks = openTasks.filter((t) => t.projectId === p.id);
    const blocked = p.status === "blocked" ? ` | BLOCKED: ${p.blockedReason ?? "no reason logged"}` : "";
    lines.push(
      `- "${p.name}" | status: ${p.status} | priority: ${p.priority} | progress: ${p.progress}% | deadline: ${fmt(p.deadline)} | open tasks: ${projectTasks.length}${blocked}`
    );
  }

  lines.push("\n=== OPEN TASKS (not done) ===");
  for (const t of openTasks) {
    const proj = allProjects.find((p) => p.id === t.projectId);
    const assignee = allUsers.find((u) => u.id === t.assigneeId);
    lines.push(
      `- "${t.title}" | project: ${proj?.name ?? "unknown"} | status: ${t.status} | priority: ${t.priority} | due: ${fmt(t.dueDate)} | assignee: ${assignee?.name ?? "unassigned"}`
    );
  }

  lines.push("\n=== IDEAS ===");
  for (const i of allIdeas) {
    lines.push(`- "${i.title}" | status: ${i.status} | priority: ${i.priority}`);
  }

  lines.push("\n=== TEAM ===");
  for (const u of allUsers) {
    const openCount = openTasks.filter((t) => t.assigneeId === u.id).length;
    lines.push(`- ${u.name} (${u.role}) | open tasks: ${openCount} | skills: ${u.skills.join(", ") || "none listed"}`);
  }

  const totalBomSpend = allBom.reduce((sum, b) => sum + (b.unitCost ?? 0) * b.quantity, 0);
  lines.push(`\nTotal BOM spend across all projects: ₹${totalBomSpend.toLocaleString("en-IN")}`);

  return lines.join("\n");
}

// Full detail for one project — used by the per-project AI copilot actions.
export async function buildProjectContext(projectId: string): Promise<string | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;

  const [projectTasks, projectBom] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, projectId)),
    db.select().from(bomItems).where(eq(bomItems.projectId, projectId)),
  ]);

  const lines: string[] = [];
  lines.push(`Project: ${project.name}`);
  lines.push(`Status: ${project.status} | Priority: ${project.priority} | Progress: ${project.progress}%`);
  if (project.description) lines.push(`Description: ${project.description}`);
  if (project.objective) lines.push(`Objective: ${project.objective}`);
  if (project.technologies.length) lines.push(`Technologies: ${project.technologies.join(", ")}`);
  if (project.status === "blocked") lines.push(`Blocked reason: ${project.blockedReason ?? "not logged"}`);

  lines.push("\nTasks:");
  for (const t of projectTasks) {
    lines.push(`- [${t.status}] ${t.title} (priority: ${t.priority})`);
  }
  if (projectTasks.length === 0) lines.push("(no tasks yet)");

  if (projectBom.length > 0) {
    lines.push("\nBOM:");
    for (const b of projectBom) {
      lines.push(`- ${b.component} x${b.quantity} (${b.status})`);
    }
  }

  return lines.join("\n");
}
