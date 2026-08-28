"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Transitions only App Router page content. The surrounding application frame,
 * navbar, and background remain outside this keyed presence boundary.
 */
export function RouteContentTransition({
  children,
  constrainToViewport = false,
}: {
  children: ReactNode;
  constrainToViewport?: boolean;
}) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0.08 : 0.22;

  return (
    <div
      className={cn(
        "grid flex-1 grid-cols-1",
        constrainToViewport
          ? "min-h-0 overflow-hidden"
          : "min-h-[calc(100svh-3.75rem)] md:min-h-[calc(100svh-4rem)]",
      )}
      data-slot="route-content"
    >
      <motion.div
        key={pathname}
        className="col-start-1 row-start-1 flex min-h-0 min-w-0 flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}
