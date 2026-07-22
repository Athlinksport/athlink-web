import Link from "next/link";
import { Activity } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      aria-label="Athlink dashboard"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-heading text-lg font-bold tracking-tight text-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Activity aria-hidden="true" className="size-4.5" strokeWidth={2.5} />
      </span>
      Athlink
    </Link>
  );
}
