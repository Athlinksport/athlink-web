"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Transitions only App Router page content. The surrounding application frame,
 * navbar, and background remain outside this keyed presence boundary.
 */
export function RouteContentTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0.08 : 0.22;

  return (
    <div
      className="grid min-h-[calc(100svh-3.75rem)] flex-1 grid-cols-1 md:min-h-[calc(100svh-4rem)]"
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
