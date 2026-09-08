import Link from "next/link";
import { db } from "@/db";
import { links, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Files as FilesIcon, Code2, FileSpreadsheet, HardDrive, Video, PenTool, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

const TYPE_META: Record<string, { label: string; icon: typeof Link2 }> = {
  google_sheet: { label: "Google Sheet", icon: FileSpreadsheet },
  google_drive: { label: "Google Drive", icon: HardDrive },
  github: { label: "GitHub", icon: Code2 },
  figma: { label: "Figma", icon: PenTool },
  youtube: { label: "YouTube", icon: Video },
  other: { label: "Other", icon: Link2 },
};

export default async function FilesPage() {
  const rows = await db
    .select({
      id: links.id,
      label: links.label,
      url: links.url,
      type: links.type,
      projectId: links.projectId,
      projectName: projects.name,
    })
    .from(links)
    .leftJoin(projects, eq(links.projectId, projects.id))
    .orderBy(desc(links.createdAt));

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        All files and external links across every project. Add new ones from a project&rsquo;s Files tab.
      </p>

      <Card>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <FilesIcon size={22} className="text-muted" />
            <p className="text-[13px] font-medium text-ink">No files or links yet</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((row) => {
              const meta = TYPE_META[row.type] ?? TYPE_META.other;
              const Icon = meta.icon;
              return (
                <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon size={16} className="shrink-0 text-muted" />
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 hover:underline"
                  >
                    <p className="truncate text-[13px] text-ink">{row.label}</p>
                    <p className="truncate text-[12px] text-muted">{row.url}</p>
                  </a>
                  {row.projectName && (
                    <Link href={`/projects/${row.projectId}`}>
                      <Badge soft="bg-info-soft" text="text-info">{row.projectName}</Badge>
                    </Link>
                  )}
                  <span className="shrink-0 text-[11px] text-muted">{meta.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
