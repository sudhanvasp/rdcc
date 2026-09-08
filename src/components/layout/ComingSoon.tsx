import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function ComingSoon({
  icon: Icon,
  title,
  phase,
  description,
}: {
  icon: LucideIcon;
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-signal-soft text-signal">
          <Icon size={20} />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-medium text-ink">{title}</h2>
          <Badge soft="bg-info-soft" text="text-info">{phase}</Badge>
        </div>
        <p className="max-w-[42ch] text-[13px] text-muted">{description}</p>
      </div>
    </Card>
  );
}
