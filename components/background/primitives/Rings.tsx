"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

type RingsProps = HTMLMotionProps<"div"> & { count?: number };

/** Concentric border rings with a small, bounded DOM footprint. */
export function Rings({ count = 3, className, ...props }: RingsProps) {
  const safeCount = Math.min(Math.max(count, 1), 6);

  return (
    <motion.div className={cn("absolute aspect-square w-80", className)} {...props}>
      {Array.from({ length: safeCount }, (_, index) => (
        <span
          key={index}
          className="absolute rounded-full border border-primary/10"
          style={{ inset: `${index * 12}%` }}
        />
      ))}
    </motion.div>
  );
}
