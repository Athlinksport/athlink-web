"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";
import { useScene } from "../hooks/useScene";

type ParticlesProps = HTMLMotionProps<"div"> & { count?: number };

/** Small DOM-based dot field. Count is intentionally capped to keep scenes inexpensive. */
export function Particles({ count = 8, className, ...props }: ParticlesProps) {
  const safeCount = Math.min(Math.max(count, 0), 16);
  const { reducedMotion } = useScene();

  return (
    <motion.div className={cn("absolute inset-0", className)} {...props}>
      {Array.from({ length: safeCount }, (_, index) => (
        <motion.span
          key={index}
          className="absolute size-1 rounded-full bg-primary/20 will-change-transform"
          style={{
            left: `${(index * 37 + 11) % 94 + 3}%`,
            top: `${(index * 61 + 7) % 90 + 5}%`,
          }}
          animate={
            reducedMotion
              ? undefined
              : {
                  x: [0, (index % 2 === 0 ? 1 : -1) * (8 + (index % 4) * 3), 0],
                  y: [0, (index % 3 === 0 ? -1 : 1) * (10 + (index % 5) * 2), 0],
                  opacity: [0.16, 0.32, 0.16],
                }
          }
          transition={{
            duration: 14 + (index % 5) * 2.5,
            delay: -(index % 7) * 1.7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}
