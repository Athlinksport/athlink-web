import type { ComponentProps } from "react";

import { AnimatedBackground } from "@/components/background/AnimatedBackground";
import { cn } from "@/lib/utils";

export function AppShell({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell"
      className={cn(
        "relative isolate flex min-h-svh flex-col bg-background text-foreground",
        className,
      )}
      {...props}
    >
      <AnimatedBackground />
      <div className="relative z-10 flex min-h-svh flex-col">{children}</div>
    </div>
  );
}
