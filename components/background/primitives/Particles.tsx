"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

type ParticlesProps = HTMLMotionProps<"div"> & { count?: number };

/** Small DOM-based dot field. Count is intentionally capped to keep scenes inexpensive. */
export function Particles({ count = 8, className, ...props }: ParticlesProps) {
  const safeCount = Math.min(Math.max(count, 0), 16);

  return (
    <motion.div className={cn("absolute inset-0", className)} {...props}>
      {Array.from({ length: safeCount }, (_, index) => (
        <span
          key={index}
          className="absolute size-1 rounded-full bg-primary/20"
          style={{ left: `${(index * 37) % 100}%`, top: `${(index * 61) % 100}%` }}
        />
      ))}
    </motion.div>
  );
}
