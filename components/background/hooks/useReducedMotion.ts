"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/** Returns a stable boolean for the operating system's reduced-motion setting. */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}
