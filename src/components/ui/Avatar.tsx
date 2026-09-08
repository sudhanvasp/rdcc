import { initials } from "@/lib/utils";

export function Avatar({
  name,
  color = "#2A5DD9",
  size = 24,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: color,
      }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
