"use client";

import { BackgroundProvider } from "./BackgroundProvider";
import { GlobalBackground } from "./GlobalBackground";
import { BackgroundProfilesProvider } from "./profiles/BackgroundProfilesProvider";

/**
 * The single persistent, non-interactive background for the authenticated app.
 */
export function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      data-slot="animated-background"
    >
      <BackgroundProvider>
        <BackgroundProfilesProvider>
          <GlobalBackground />
        </BackgroundProfilesProvider>
      </BackgroundProvider>
    </div>
  );
}
