"use client";

import { useScroll } from "framer-motion";

/** Exposes Framer Motion's shared document scroll progress without listeners per primitive. */
export function useScrollProgress() {
  return useScroll().scrollYProgress;
}
