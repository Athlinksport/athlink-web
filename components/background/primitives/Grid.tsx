"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

/** Reusable CSS grid texture with no generated child elements. */
export function Grid({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(
        "absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,var(--lime)_1px,transparent_1px),linear-gradient(to_bottom,var(--lime)_1px,transparent_1px)] [background-size:3rem_3rem]",
        className,
      )}
      {...props}
    />
  );
}
