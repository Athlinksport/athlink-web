import { CircleAlert } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function InlineError({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="inline-error"
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className,
      )}
      {...props}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
