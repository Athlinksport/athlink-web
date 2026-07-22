"use client";

import { useBackground } from "../BackgroundProvider";

/** Access scene-wide motion state from any background primitive or composition. */
export function useScene() {
  return useBackground();
}
