import Image from "next/image";

import { cn } from "@/lib/utils";
import { initials } from "@/lib/groups/utils";

export function GroupAvatar({
  name,
  url,
  size = "md",
  className,
}: {
  name: string;
  url: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "size-9 text-xs",
    md: "size-12 text-sm",
    lg: "size-16 text-lg",
    xl: "size-24 text-2xl sm:size-28",
  };
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-lime-300/25 to-cyan-400/10 font-bold text-lime-300 shadow-lg",
        sizes[size],
        className,
      )}
    >
      {url ? <Image src={url} alt={`${name} avatar`} fill sizes="112px" className="object-cover" /> : initials(name)}
    </span>
  );
}
