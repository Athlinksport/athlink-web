import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type LoadingStateProps = ComponentProps<"div"> & {
  label?: string;
};

export function LoadingState({ className, label = "Loading…", ...props }: LoadingStateProps) {
  return (
    <div
      data-slot="loading-state"
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground", className)}
      {...props}
    >
      <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
