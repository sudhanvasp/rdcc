"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, Dot } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Field";
import {
  PRIORITY_META,
  PROJECT_STATUS_META,
  dueLabel,
  formatDate,
} from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { ProjectTasksTab } from "./ProjectTasksTab";
import { ProjectBomTab } from "./ProjectBomTab";
import { ProjectExperimentsTab } from "./ProjectExperimentsTab";
import { ProjectFilesTab } from "./ProjectFilesTab";
import { ProjectAiTab } from "./ProjectAiTab";
import { ProjectTagsEditor } from "./ProjectTagsEditor";
import { ProjectVersionsTab } from "./ProjectVersionsTab";

const TABS = [
  { id: "overview", label: "Overview", live: true },
  { id: "tasks", label: "Tasks", live: true },
  { id: "bom", label: "BOM", live: true },
  { id: "experiments", label: "Experiments", live: true },
  { id: "files", label: "Files", live: true },
  { id: "versions", label: "Versions", live: true },
  { id: "activity", label: "Activity", live: true },
  { id: "ai", label: "AI", live: true },
] as const;

export function ProjectWorkspace({
  project,
  members,
  tasks,
  activity,
  teamMembers,
  bomItems,
  experiments,
  links,
  allTags,
  projectTags,
  versions,
  dependencies,
}: {
  project: any;
  members: { userId: string; name: string; avatarColor: string; roleOnProject: string | null }[];
  tasks: any[];
  activity: { id: string; message: string; createdAt: string | Date; actorName: string | null }[];
  teamMembers: { id: string; name: string; avatarColor: string }[];
  bomItems: any[];
  experiments: any[];
  links: any[];
  allTags: { id: string; name: string; color: string }[];
  projectTags: { tagId: string; name: string; color: string }[];
  versions: any[];
  dependencies: { taskId: string; dependsOnId: string; dependsOnTitle: string; dependsOnStatus: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [current, setCurrent] = useState(project);

  const pm = PRIORITY_META[current.priority as keyof typeof PRIORITY_META];
  const sm = PROJECT_STATUS_META[current.status as keyof typeof PROJECT_STATUS_META];

  async function patch(fields: Record<string, unknown>) {
    setCurrent((c: any) => ({ ...c, ...fields }));
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    router.refresh();
  }

  async function deleteProject() {
    if (!confirm(`Delete "${current.name}"? This can't be undone.`)) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    toast("Project deleted");
    router.push("/projects");
  }

  return (
    <div className="space-y-4">
      <Link href="/projects" className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft size={14} /> Projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Dot className={pm.dot} />
            <h1 className="text-[18px] font-semibold text-ink">{current.name}</h1>
          </div>
          {current.description && (
            <p className="mt-1 max-w-[60ch] text-[13px] text-muted">{current.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {members.map((m) => (
              <Avatar key={m.userId} name={m.name} color={m.avatarColor} size={26} />
            ))}
          </div>
          <button
            onClick={deleteProject}
            className="rounded-md p-2 text-muted hover:bg-critical-soft hover:text-critical"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 rounded-md border border-line bg-surface px-4 py-3">
        <Field label="Status">
          <select
            value={current.status}
            onChange={(e) => patch({ status: e.target.value })}
            className={`rounded-[5px] border-0 px-2 py-0.5 text-[12px] font-medium ${sm.soft} ${sm.text}`}
          >
            {Object.entries(PROJECT_STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={current.priority}
            onChange={(e) => patch({ priority: e.target.value })}
            className="rounded-[5px] border border-line px-2 py-0.5 text-[12px] font-medium text-ink"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <Field label="Progress">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={current.progress}
              onChange={(e) => patch({ progress: Number(e.target.value) })}
              className="w-28 accent-[#2A5DD9]"
            />
            <span className="text-[12px] text-muted">{current.progress}%</span>
          </div>
        </Field>
        <Field label="Deadline">
          <span className="text-[13px] text-ink">{dueLabel(current.deadline)}</span>
        </Field>
        {current.category && <Field label="Category"><Badge>{current.category}</Badge></Field>}
        {current.client && <Field label="Client"><span className="text-[13px] text-ink">{current.client}</span></Field>}
      </div>

      {current.technologies?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {current.technologies.map((t: string) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}

      <ProjectTagsEditor projectId={project.id} allTags={allTags} initialProjectTags={projectTags} />

      <div className="flex gap-5 border-b border-line px-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => t.live && setTab(t.id)}
            disabled={!t.live}
            className={`relative -mb-px flex items-center gap-1.5 py-2.5 text-[13px] font-medium transition-colors ${
              tab === t.id ? "text-ink" : t.live ? "text-muted hover:text-ink" : "text-neutral cursor-not-allowed"
            }`}
          >
            {t.label}
            {!t.live && <span className="text-[10px] text-neutral">soon</span>}
            {tab === t.id && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-signal" />
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <h3 className="mb-2 text-[13px] font-medium text-ink">Objective</h3>
            <p className="text-[13px] text-muted">
              {current.objective || "No objective set yet."}
            </p>
          </Card>
          <Card>
            <CardHeader title="Team" />
            <div className="space-y-2 p-4">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2">
                  <Avatar name={m.name} color={m.avatarColor} size={22} />
                  <span className="text-[13px] text-ink">{m.name}</span>
                  {m.roleOnProject && (
                    <span className="text-[12px] text-muted">· {m.roleOnProject}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "tasks" && (
        <ProjectTasksTab
          projectId={project.id}
          initialTasks={tasks}
          teamMembers={teamMembers}
          initialDependencies={dependencies}
        />
      )}

      {tab === "bom" && (
        <ProjectBomTab projectId={project.id} initialItems={bomItems} />
      )}

      {tab === "experiments" && (
        <ProjectExperimentsTab projectId={project.id} initialExperiments={experiments} />
      )}

      {tab === "files" && (
        <ProjectFilesTab projectId={project.id} initialLinks={links} />
      )}

      {tab === "ai" && <ProjectAiTab projectId={project.id} />}

      {tab === "versions" && (
        <ProjectVersionsTab projectId={project.id} initialVersions={versions} />
      )}

      {tab === "activity" && (
        <Card>
          <div className="divide-y divide-line">
            {activity.length === 0 && (
              <p className="px-4 py-6 text-[13px] text-muted">No activity recorded yet.</p>
            )}
            {activity.map((a) => (
              <div key={a.id} className="px-4 py-2.5">
                <p className="text-[13px] text-ink">{a.message}</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {a.actorName ?? "System"} · {formatDate(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      {children}
    </div>
  );
}
