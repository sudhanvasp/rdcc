"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-5 border-b border-line px-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "relative -mb-px py-2.5 text-[13px] font-medium transition-colors",
            active === t.id ? "text-ink" : "text-muted hover:text-ink"
          )}
        >
          {t.label}
          {active === t.id && (
            <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-signal" />
          )}
        </button>
      ))}
    </div>
  );
}
