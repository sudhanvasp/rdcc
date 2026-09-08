"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, File } from "lucide-react";

export function ExportMenu({ baseUrl }: { baseUrl: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const options = [
    { format: "pdf", label: "Export as PDF", icon: File },
    { format: "excel", label: "Export as Excel", icon: FileSpreadsheet },
    { format: "word", label: "Export as Word", icon: FileText },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-[13px] text-muted hover:bg-canvas hover:text-ink"
      >
        <Download size={13} /> Export
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-44 rounded-md border border-line bg-surface py-1 shadow-lg">
          {options.map((o) => (
            <a
              key={o.format}
              href={`${baseUrl}?format=${o.format}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-ink hover:bg-canvas"
            >
              <o.icon size={13} className="text-muted" />
              {o.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
