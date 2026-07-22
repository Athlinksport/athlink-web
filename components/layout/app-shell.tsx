import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function AppShell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell"
      className={cn("flex min-h-svh flex-col bg-background text-foreground", className)}
      {...props}
    />
  );
}
