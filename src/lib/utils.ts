import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function daysUntil(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function dueLabel(date: Date | string | null | undefined) {
  const n = daysUntil(date);
  if (n === null) return "No due date";
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  return `Due in ${n}d`;
}

export const PRIORITY_META = {
  high: { label: "High", dot: "bg-critical", text: "text-critical", soft: "bg-critical-soft" },
  medium: { label: "Medium", dot: "bg-warning", text: "text-warning", soft: "bg-warning-soft" },
  low: { label: "Low", dot: "bg-success", text: "text-success", soft: "bg-success-soft" },
} as const;

export const PROJECT_STATUS_META = {
  idea: { label: "Idea", soft: "bg-neutral-soft", text: "text-neutral" },
  planning: { label: "Planning", soft: "bg-info-soft", text: "text-info" },
  in_development: { label: "In Development", soft: "bg-info-soft", text: "text-info" },
  testing: { label: "Testing", soft: "bg-warning-soft", text: "text-warning" },
  blocked: { label: "Blocked", soft: "bg-critical-soft", text: "text-critical" },
  review: { label: "Review", soft: "bg-warning-soft", text: "text-warning" },
  completed: { label: "Completed", soft: "bg-success-soft", text: "text-success" },
  archived: { label: "Archived", soft: "bg-neutral-soft", text: "text-neutral" },
} as const;

export const TASK_STATUS_META = {
  todo: { label: "Todo", soft: "bg-neutral-soft", text: "text-neutral" },
  in_progress: { label: "In Progress", soft: "bg-info-soft", text: "text-info" },
  blocked: { label: "Blocked", soft: "bg-critical-soft", text: "text-critical" },
  review: { label: "Review", soft: "bg-warning-soft", text: "text-warning" },
  done: { label: "Done", soft: "bg-success-soft", text: "text-success" },
} as const;

export const IDEA_STATUS_META = {
  inbox: { label: "Inbox", soft: "bg-neutral-soft", text: "text-neutral" },
  evaluating: { label: "Evaluating", soft: "bg-warning-soft", text: "text-warning" },
  approved: { label: "Approved", soft: "bg-info-soft", text: "text-info" },
  rejected: { label: "Rejected", soft: "bg-critical-soft", text: "text-critical" },
  converted: { label: "Converted", soft: "bg-success-soft", text: "text-success" },
  archived: { label: "Archived", soft: "bg-neutral-soft", text: "text-neutral" },
} as const;
