"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

type Tag = { id: string; name: string; color: string };
type ProjectTag = { tagId: string; name: string; color: string };

export function ProjectTagsEditor({
  projectId,
  allTags,
  initialProjectTags,
}: {
  projectId: string;
  allTags: Tag[];
  initialProjectTags: ProjectTag[];
}) {
  const [projectTags, setProjectTags] = useState<ProjectTag[]>(initialProjectTags);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const available = allTags.filter((t) => !projectTags.some((pt) => pt.tagId === t.id));

  async function addTag(tag: Tag) {
    setProjectTags((prev) => [...prev, { tagId: tag.id, name: tag.name, color: tag.color }]);
    setMenuOpen(false);
    await fetch(`/api/projects/${projectId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: tag.id }),
    });
  }

  async function createAndAddTag() {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setNewTagName("");
    await addTag(data.tag);
  }

  async function removeTag(tagId: string) {
    setProjectTags((prev) => prev.filter((t) => t.tagId !== tagId));
    await fetch(`/api/projects/${projectId}/tags?tagId=${tagId}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {projectTags.map((t) => (
        <Badge key={t.tagId} className="flex items-center gap-1 pr-1">
          {t.name}
          <button onClick={() => removeTag(t.tagId)} className="hover:text-critical">
            <X size={10} />
          </button>
        </Badge>
      ))}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-1 rounded-[5px] border border-dashed border-line px-2 py-0.5 text-[12px] text-muted hover:text-ink"
        >
          <Plus size={11} /> Tag
        </button>
        {menuOpen && (
          <div className="absolute left-0 z-20 mt-1 w-48 rounded-md border border-line bg-surface p-2 shadow-lg">
            {available.map((t) => (
              <button
                key={t.id}
                onClick={() => addTag(t)}
                className="block w-full rounded px-2 py-1 text-left text-[12.5px] text-ink hover:bg-canvas"
              >
                {t.name}
              </button>
            ))}
            <div className="mt-1 flex gap-1 border-t border-line pt-1.5">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createAndAddTag()}
                placeholder="New tag"
                className="w-full rounded border border-line px-1.5 py-1 text-[12px] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
