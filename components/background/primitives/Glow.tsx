"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";
import { useScene } from "../hooks/useScene";

/** Soft radial light that can be positioned and colored by a scene. */
export function Glow({ className, ...props }: HTMLMotionProps<"div">) {
  const { reducedMotion } = useScene();

  return (
    <motion.div
      className={cn("absolute size-64 rounded-full bg-primary/10 blur-3xl", className)}
      animate={reducedMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      {...props}
    />
  );
}
