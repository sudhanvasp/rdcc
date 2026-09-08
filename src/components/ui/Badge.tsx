import { cn } from "@/lib/utils";

export function Badge({
  children,
  soft = "bg-neutral-soft",
  text = "text-neutral",
  className,
}: {
  children: React.ReactNode;
  soft?: string;
  text?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] px-2 py-0.5 text-[12px] font-medium leading-none",
        soft,
        text,
        className
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", className)} />;
}
