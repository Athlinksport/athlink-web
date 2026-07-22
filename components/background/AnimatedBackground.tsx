"use client";

import { BackgroundProvider } from "./BackgroundProvider";
import { SceneRenderer } from "./SceneRenderer";

/**
 * Reusable, non-interactive background layer for application shells.
 * Scene content is route-aware and isolated from page layout and pointer events.
 */
export function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      data-slot="animated-background"
    >
      <BackgroundProvider>
        <SceneRenderer />
      </BackgroundProvider>
    </div>
  );
}
