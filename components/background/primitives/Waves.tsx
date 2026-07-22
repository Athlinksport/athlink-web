"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

/** Layered CSS curves suitable for subtle ambient movement. */
export function Waves({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(
        "absolute inset-x-0 bottom-0 h-48 opacity-10 [background:radial-gradient(100%_80%_at_50%_100%,transparent_60%,var(--lime)_61%,transparent_62%)]",
        className,
      )}
      {...props}
    />
  );
}
