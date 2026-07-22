"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

/** CSS-only network texture with no canvas or runtime graph simulation. */
export function Network({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(
        "absolute inset-0 opacity-10 [background-image:linear-gradient(30deg,transparent_48%,var(--lime)_49%,var(--lime)_50%,transparent_51%),linear-gradient(-30deg,transparent_48%,var(--lime)_49%,var(--lime)_50%,transparent_51%)] [background-size:6rem_6rem]",
        className,
      )}
      {...props}
    />
  );
}
