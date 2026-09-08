"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderKanban, Lightbulb, ListChecks, User, Plus } from "lucide-react";

type Result = {
  type: "project" | "idea" | "task" | "person";
  id: string;
  label: string;
  href: string;
};

const ICONS = {
  project: FolderKanban,
  idea: Lightbulb,
  task: ListChecks,
  person: User,
};

const QUICK_ACTIONS = [
  { label: "New Idea", href: "/ideas?new=1" },
  { label: "New Project", href: "/projects?new=1" },
  { label: "New Task", href: "/tasks?new=1" },
  { label: "Open Dashboard", href: "/dashboard" },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const filteredActions = QUICK_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-md border border-line bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={15} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, ideas, tasks, people…"
            className="h-11 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <span className="kbd">Esc</span>
        </div>

        <div className="max-h-80 overflow-y-auto py-1.5">
          {query.trim().length < 2 && (
            <div>
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                Quick actions
              </p>
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.href}
                  onClick={() => go(a.href)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink hover:bg-canvas"
                >
                  <Plus size={14} className="text-muted" />
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {query.trim().length >= 2 && filteredActions.length > 0 && (
            <div>
              {filteredActions.map((a) => (
                <button
                  key={a.href}
                  onClick={() => go(a.href)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink hover:bg-canvas"
                >
                  <Plus size={14} className="text-muted" />
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                Results
              </p>
              {results.map((r) => {
                const Icon = ICONS[r.type];
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => go(r.href)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink hover:bg-canvas"
                  >
                    <Icon size={14} className="text-muted" />
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}

          {query.trim().length >= 2 &&
            results.length === 0 &&
            filteredActions.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-muted">
                No matches for &ldquo;{query}&rdquo;
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
