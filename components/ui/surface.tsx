import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SurfaceProps = ComponentProps<"div"> & {
  variant?: "default" | "elevated" | "muted" | "glass";
};

const variants: Record<NonNullable<SurfaceProps["variant"]>, string> = {
  default: "bg-surface shadow-surface",
  elevated: "bg-surface-elevated shadow-elevated",
  muted: "bg-surface-muted",
  glass: "bg-surface/80 shadow-surface backdrop-blur-xl",
};

export function Surface({ className, variant = "default", ...props }: SurfaceProps) {
  return (
    <div
      data-slot="surface"
      data-variant={variant}
      className={cn("rounded-xl border border-border", variants[variant], className)}
      {...props}
    />
  );
}
