"use client";

import { createContext, useContext, type ReactNode } from "react";
import { MotionConfig, type MotionValue } from "framer-motion";

import { useReducedMotion } from "@/components/background/hooks/useReducedMotion";
import { useScrollProgress } from "@/components/background/hooks/useScrollProgress";

type BackgroundContextValue = {
  reducedMotion: boolean;
  scrollProgress: MotionValue<number>;
};

const BackgroundContext = createContext<BackgroundContextValue | null>(null);

/** Shares motion preferences and a single scroll signal across the active scene. */
export function BackgroundProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const scrollProgress = useScrollProgress();

  return (
    <BackgroundContext.Provider value={{ reducedMotion, scrollProgress }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);

  if (!context) {
    throw new Error("useBackground must be used within BackgroundProvider");
  }

  return context;
}
