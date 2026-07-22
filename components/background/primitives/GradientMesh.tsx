"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

/** Lightweight CSS gradient surface; scenes control colors through className. */
export function GradientMesh({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--lime)_8%,transparent),transparent_38%),radial-gradient(circle_at_80%_70%,color-mix(in_oklch,var(--chart-3)_7%,transparent),transparent_42%)]",
        className,
      )}
      {...props}
    />
  );
}
