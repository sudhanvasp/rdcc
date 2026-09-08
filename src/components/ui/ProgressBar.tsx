import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-neutral-soft", className)}>
      <div
        className={cn("h-full rounded-full bg-signal transition-[width]", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
