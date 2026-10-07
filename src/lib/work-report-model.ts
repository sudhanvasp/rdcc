// Pure logic for the Work Report: decides which projects belong in a period
// and turns raw rows into the sentences and table rows the report shows.
// No database and no Word code in here, so it is easy to test.
//
// Dates: calendar days are handled as 'YYYY-MM-DD' strings throughout.
//  - real moments (createdAt, updatedAt) are converted to a day in the
//    workspace timezone, so "Oct 6" means Oct 6 where the team works;
//  - date-only values the app stores as UTC midnight (deadline, start date)
//    are read back in UTC, so they always show the day that was typed in.

import { PROJECT_STATUS_META, TASK_STATUS_META } from "./utils";

export type ProjectRow = {
  id: string;
  name: string;
  status: keyof typeof PROJECT_STATUS_META;
  progress: number;
  division: "client" | "rnd";
  client: string | null;
  deadline: Date | null;
  startDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  blockedReason: string | null;
};
export type TaskRow = {
  projectId: string;
  title: string;
  status: keyof typeof TASK_STATUS_META;
  dueDate: Date | null;
  updatedAt: Date;
};
export type MemberRow = { projectId: string; name: string };
export type LogRow = { logDate: string; userName: string; projectId: string | null; body: string };

export type ReportInput = {
  projects: ProjectRow[];
  tasks: TaskRow[];
  members: MemberRow[];
  logs: LogRow[];
};

export type ReportOptions = {
  fromYmd: string;
  toYmd: string;
  todayYmd: string;
  tz: string;
  preparedBy: string;
};

// A run of text; b = bold. A paragraph is a list of these.
export type Seg = { t: string; b?: boolean };

export type ProjectSection = {
  number: number;
  name: string;
  narrative: Seg[][];
  facts: [string, string][];
  tasks: { rows: [string, string][]; more: number };
};

export type ReportModel = {
  title: string;
  filename: string;
  dateLine: { date: string; preparedBy: string };
  overview: { paragraph: Seg[]; rows: string[][] };
  projects: ProjectSection[];
  deadlines: { paragraph: Seg[]; rows: string[][] };
  daily: { paragraph: Seg[]; note: string | null; rows: string[][] };
  summary: Seg[][];
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MON3 = MONTHS.map((m) => m.slice(0, 3));

export function ymdInZone(date: Date, tz: string): string {
  const make = (zone: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  };
  try {
    return make(tz);
  } catch {
    return make("UTC"); // unknown timezone name
  }
}

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function isValidYmd(ymd: string): boolean {
  const p = parseYmd(ymd);
  if (!p) return false;
  const check = new Date(Date.UTC(p.y, p.m - 1, p.d));
  return check.getUTCFullYear() === p.y && check.getUTCMonth() === p.m - 1 && check.getUTCDate() === p.d;
}

/** "8 October 2026" */
export function longDate(ymd: string): string {
  const p = parseYmd(ymd);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : ymd;
}

/** "8 Oct 2026" */
export function shortDate(ymd: string): string {
  const p = parseYmd(ymd);
  return p ? `${p.d} ${MON3[p.m - 1]} ${p.y}` : ymd;
}

/** "August 2026" */
export function monthYear(ymd: string): string {
  const p = parseYmd(ymd);
  return p ? `${MONTHS[p.m - 1]} ${p.y}` : ymd;
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(aYmd: string, bYmd: string): number {
  const a = parseYmd(aYmd);
  const b = parseYmd(bYmd);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

export function periodTitle(fromYmd: string, toYmd: string): string {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  if (!a || !b) return `${fromYmd} – ${toYmd}`;
  if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m - 1]} ${a.y}`;
  if (a.y === b.y) return `${a.d} ${MON3[a.m - 1]} – ${b.d} ${MON3[b.m - 1]} ${a.y}`;
  return `${a.d} ${MON3[a.m - 1]} ${a.y} – ${b.d} ${MON3[b.m - 1]} ${b.y}`;
}

export function periodFilename(fromYmd: string, toYmd: string): string {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  if (a && b && a.y === b.y && a.m === b.m) return `Work_Report_${MONTHS[a.m - 1]}_${a.y}.docx`;
  return `Work_Report_${fromYmd}_to_${toYmd}.docx`;
}

// ---------------------------------------------------------------------------
// Small text helpers
// ---------------------------------------------------------------------------

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const isAre = (n: number) => (n === 1 ? "is" : "are");

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

// Single-line version of free text (blocked reasons etc.).
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const DONE_STATES = ["completed", "archived"];
const TASK_ORDER: Record<string, number> = { blocked: 0, in_progress: 1, review: 2, todo: 3, done: 4 };
const MAX_TASK_ROWS = 8;
const MAX_LOG_ROWS = 60;
export const DEADLINE_WINDOW_DAYS = 30;

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

export function buildReportModel(input: ReportInput, opts: ReportOptions): ReportModel {
  const { fromYmd, toYmd, todayYmd, tz } = opts;
  const inPeriod = (ymd: string) => ymd >= fromYmd && ymd <= toYmd;
  const instantDay = (d: Date) => ymdInZone(d, tz);
  const dateOnlyDay = (d: Date) => ymdInZone(d, "UTC");

  const periodLogs = input.logs.filter((l) => inPeriod(l.logDate));
  const projectName = new Map(input.projects.map((p) => [p.id, p.name]));

  const tasksOf = (id: string) => input.tasks.filter((t) => t.projectId === id);
  const logsOf = (id: string) => periodLogs.filter((l) => l.projectId === id);
  const teamOf = (id: string) =>
    Array.from(new Set(input.members.filter((m) => m.projectId === id).map((m) => m.name))).sort((a, b) =>
      a.localeCompare(b)
    );

  const assignedDay = (p: ProjectRow) => (p.startDate ? dateOnlyDay(p.startDate) : instantDay(p.createdAt));

  // A project is in scope if it existed by the end of the period and something
  // happened to it during the period.
  const inScope = input.projects
    .filter((p) => {
      if (instantDay(p.createdAt) > toYmd) return false;
      return (
        inPeriod(instantDay(p.createdAt)) ||
        inPeriod(instantDay(p.updatedAt)) ||
        (p.deadline !== null && inPeriod(dateOnlyDay(p.deadline))) ||
        logsOf(p.id).length > 0 ||
        tasksOf(p.id).some((t) => inPeriod(instantDay(t.updatedAt)))
      );
    })
    .sort((a, b) => assignedDay(a).localeCompare(assignedDay(b)) || a.name.localeCompare(b.name));

  // ----- counts used by the overview and the summary -----
  const completed = inScope.filter((p) => p.status === "completed").length;
  const blocked = inScope.filter((p) => p.status === "blocked").length;
  const archived = inScope.filter((p) => p.status === "archived").length;
  const open = inScope.length - completed - blocked - archived;
  const breakdownParts: string[] = [];
  if (completed) breakdownParts.push(`${completed} completed`);
  if (open) breakdownParts.push(`${open} in progress`);
  if (blocked) breakdownParts.push(`${blocked} blocked`);
  if (archived) breakdownParts.push(`${archived} archived`);
  const breakdown = joinList(breakdownParts);

  // ----- overview -----
  const range = `${longDate(fromYmd)} to ${longDate(toYmd)}`;
  const overviewParagraph: Seg[] =
    inScope.length === 0
      ? [{ t: `This report covers work from ${range}. No project activity was recorded in this period.` }]
      : [
          {
            t: `This report covers work from ${range}. ${plural(inScope.length, "project")} ${
              inScope.length === 1 ? "was" : "were"
            } in scope: ${breakdown}.`,
          },
        ];
  const overviewRows = inScope.map((p, i) => [
    String(i + 1),
    p.name,
    monthYear(assignedDay(p)),
    PROJECT_STATUS_META[p.status].label,
  ]);

  // ----- one section per project -----
  const projects: ProjectSection[] = inScope.map((p, i) => {
    const label = PROJECT_STATUS_META[p.status].label;
    const assigned = monthYear(assignedDay(p));
    const isClosed = DONE_STATES.includes(p.status);
    const deadlineDay = p.deadline ? dateOnlyDay(p.deadline) : null;
    const daysToDeadline = deadlineDay ? daysBetween(todayYmd, deadlineDay) : null;

    const tasks = tasksOf(p.id);
    const tasksDone = tasks.filter((t) => t.status === "done").length;
    const tasksOverdue = tasks.filter(
      (t) => t.status !== "done" && t.dueDate !== null && dateOnlyDay(t.dueDate) < todayYmd
    ).length;
    const logs = logsOf(p.id);

    // Paragraph 1: where the project stands
    const first: Seg[] = [{ t: "Assigned in " }, { t: assigned, b: true }, { t: ". " }];
    if (p.status === "completed") {
      first.push({ t: "The project is marked " }, { t: "Completed", b: true });
      first.push({ t: ` (last updated ${longDate(instantDay(p.updatedAt))}).` });
    } else if (p.status === "archived") {
      first.push({ t: `The project is archived (last updated ${longDate(instantDay(p.updatedAt))}).` });
    } else if (p.status === "blocked") {
      first.push({ t: "The project is currently " }, { t: "blocked", b: true });
      first.push({ t: ` at ${p.progress}% progress` });
      first.push({ t: p.blockedReason ? `. Reason: ${oneLine(p.blockedReason)}.` : "." });
    } else {
      first.push({ t: "The project is currently " }, { t: label, b: true });
      first.push({ t: ` at ${p.progress}% progress.` });
    }
    if (!isClosed && deadlineDay && daysToDeadline !== null) {
      if (daysToDeadline < 0) {
        first.push({ t: ` The deadline of ${longDate(deadlineDay)} has passed (${plural(-daysToDeadline, "day")} overdue).` });
      } else if (daysToDeadline === 0) {
        first.push({ t: " The deadline is today." });
      } else {
        first.push({ t: ` The deadline is ${longDate(deadlineDay)}.` });
      }
    }

    // Paragraph 2: what the tasks and daily log show
    const sentences: string[] = [];
    if (tasks.length > 0) {
      let s = `${tasksDone} of ${plural(tasks.length, "task")} ${tasksDone === 1 ? "is" : "are"} done`;
      if (tasksOverdue > 0) s += `, and ${plural(tasksOverdue, "task")} ${isAre(tasksOverdue)} overdue`;
      sentences.push(`${s}.`);
    }
    if (logs.length > 0) {
      const latest = logs.map((l) => l.logDate).sort().slice(-1)[0];
      sentences.push(
        `${plural(logs.length, "daily-log update")} ${logs.length === 1 ? "was" : "were"} recorded in this period, the most recent on ${longDate(latest)}.`
      );
    }
    const narrative: Seg[][] = [first];
    if (sentences.length > 0) narrative.push([{ t: sentences.join(" ") }]);

    // Attribute | Detail table
    let deadlineText = "Not set";
    if (deadlineDay && daysToDeadline !== null) {
      deadlineText = longDate(deadlineDay);
      if (!isClosed) {
        if (daysToDeadline < 0) deadlineText += ` (overdue by ${plural(-daysToDeadline, "day")})`;
        else if (daysToDeadline === 0) deadlineText += " (due today)";
        else if (daysToDeadline <= DEADLINE_WINDOW_DAYS) deadlineText += ` (in ${plural(daysToDeadline, "day")})`;
      }
    }
    const issues: string[] = [];
    if (p.status === "blocked") issues.push(p.blockedReason ? `Blocked: ${oneLine(p.blockedReason)}` : "Blocked");
    if (tasksOverdue > 0) issues.push(`${plural(tasksOverdue, "overdue task")}`);
    if (!isClosed && daysToDeadline !== null && daysToDeadline < 0) issues.push("Past deadline");
    const team = teamOf(p.id);

    const facts: [string, string][] = [
      ["Assigned", assigned],
      ["Status", label],
      ["Progress", `${p.progress}%`],
      ["Deadline", deadlineText],
      ["Type", p.division === "client" ? `Client project${p.client ? ` – ${oneLine(p.client)}` : ""}` : "R&D project"],
      ["Team", team.length > 0 ? team.join(", ") : "Not assigned"],
      ["Tasks", tasks.length > 0 ? `${tasksDone} of ${tasks.length} done` : "No tasks"],
      ["Issues", issues.length > 0 ? issues.join("; ") : "None reported"],
    ];

    // Task | Status table (open work first)
    const orderedTasks = [...tasks].sort(
      (a, b) => (TASK_ORDER[a.status] ?? 9) - (TASK_ORDER[b.status] ?? 9) || a.title.localeCompare(b.title)
    );
    const taskRows = orderedTasks
      .slice(0, MAX_TASK_ROWS)
      .map((t): [string, string] => [oneLine(t.title), TASK_STATUS_META[t.status].label]);

    return {
      number: i + 1,
      name: p.name,
      narrative,
      facts,
      tasks: { rows: taskRows, more: Math.max(0, orderedTasks.length - MAX_TASK_ROWS) },
    };
  });

  // ----- upcoming deadlines (open projects only, relative to today) -----
  const upcoming = input.projects
    .filter((p) => !DONE_STATES.includes(p.status) && p.deadline !== null)
    .map((p) => ({ p, day: dateOnlyDay(p.deadline as Date) }))
    .filter(({ day }) => daysBetween(todayYmd, day) <= DEADLINE_WINDOW_DAYS)
    .sort((a, b) => a.day.localeCompare(b.day) || a.p.name.localeCompare(b.p.name));
  const overdueCount = upcoming.filter(({ day }) => day < todayYmd).length;
  const deadlineRows = upcoming.map(({ p, day }) => {
    const gap = daysBetween(todayYmd, day);
    const status = PROJECT_STATUS_META[p.status].label;
    const note = gap < 0 ? ` – overdue by ${plural(-gap, "day")}` : gap === 0 ? " – due today" : "";
    return [p.name, longDate(day), `${status}${note}`];
  });
  const deadlineParagraph: Seg[] =
    upcoming.length === 0
      ? [{ t: `No open project deadlines fall within the next ${DEADLINE_WINDOW_DAYS} days.` }]
      : [
          {
            t: `${plural(upcoming.length, "open project")} ${upcoming.length === 1 ? "has" : "have"} a deadline within the next ${DEADLINE_WINDOW_DAYS} days or already past${
              overdueCount > 0 ? ` (${overdueCount} already overdue)` : ""
            }.`,
          },
        ];

  // ----- daily log -----
  const sortedLogs = [...periodLogs].sort((a, b) => a.logDate.localeCompare(b.logDate));
  const shownLogs = sortedLogs.slice(-MAX_LOG_ROWS);
  const logDays = new Set(periodLogs.map((l) => l.logDate)).size;
  const logPeople = new Set(periodLogs.map((l) => l.userName)).size;
  const daily = {
    paragraph: [
      {
        t:
          periodLogs.length === 0
            ? "No daily-log updates were recorded in this period."
            : `${plural(periodLogs.length, "update")} ${periodLogs.length === 1 ? "was" : "were"} logged across ${plural(
                logDays,
                "day"
              )} by ${plural(logPeople, "team member")}.`,
      },
    ] as Seg[],
    note:
      sortedLogs.length > shownLogs.length
        ? `Showing the latest ${shownLogs.length} of ${sortedLogs.length} entries.`
        : null,
    rows: shownLogs.map((l) => [
      shortDate(l.logDate),
      l.userName,
      l.projectId ? projectName.get(l.projectId) ?? "Deleted project" : "General",
      l.body,
    ]),
  };

  // ----- summary (facts only) -----
  const tasksDoneInPeriod = input.tasks.filter(
    (t) => t.status === "done" && inPeriod(instantDay(t.updatedAt))
  ).length;
  const summary: Seg[][] = [];
  if (inScope.length === 0) {
    summary.push([{ t: "No project activity was recorded in this period." }]);
  } else {
    summary.push([
      {
        t: `Status of the ${plural(inScope.length, "project")} in scope: ${breakdown}. ${
          tasksDoneInPeriod === 0
            ? "No tasks were marked done in this period."
            : `${plural(tasksDoneInPeriod, "task")} ${tasksDoneInPeriod === 1 ? "was" : "were"} marked done in this period.`
        }`,
      },
    ]);
  }
  const second: string[] = [];
  second.push(
    periodLogs.length === 0
      ? "No daily-log updates were recorded."
      : `${plural(periodLogs.length, "daily-log update")} ${periodLogs.length === 1 ? "was" : "were"} recorded across ${plural(
          logDays,
          "day"
        )}.`
  );
  if (upcoming.length === 0) {
    second.push(`No open project deadlines fall within the next ${DEADLINE_WINDOW_DAYS} days.`);
  } else {
    const earliest = upcoming[0];
    const n = upcoming.length;
    const when =
      overdueCount > 0
        ? `${n === 1 ? "is" : "are"} due within the next ${DEADLINE_WINDOW_DAYS} days or already past (${overdueCount} overdue)`
        : `${n === 1 ? "falls" : "fall"} within the next ${DEADLINE_WINDOW_DAYS} days`;
    second.push(
      `${plural(n, "open deadline")} ${when}; the earliest is ${earliest.p.name} (${longDate(earliest.day)}).`
    );
  }
  summary.push([{ t: second.join(" ") }]);
  const blockedNow = inScope.filter((p) => p.status === "blocked");
  if (blockedNow.length > 0) {
    summary.push([
      { t: "Blocked: " },
      {
        t: blockedNow
          .map((p) => (p.blockedReason ? `${p.name} (${oneLine(p.blockedReason)})` : p.name))
          .join("; ") + ".",
      },
    ]);
  }

  return {
    title: `Work Report – ${periodTitle(fromYmd, toYmd)}`,
    filename: periodFilename(fromYmd, toYmd),
    dateLine: { date: longDate(todayYmd), preparedBy: opts.preparedBy },
    overview: { paragraph: overviewParagraph, rows: overviewRows },
    projects,
    deadlines: { paragraph: deadlineParagraph, rows: deadlineRows },
    daily,
    summary,
  };
}