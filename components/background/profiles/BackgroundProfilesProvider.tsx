"use client";

import { createContext, useContext, type ReactNode } from "react";

import { mockBackgroundProfiles } from "./mock-profiles";
import type { BackgroundProfile } from "./types";

const emptyProfiles: readonly BackgroundProfile[] = [];
const developmentProfiles =
  process.env.NODE_ENV === "development" ? mockBackgroundProfiles : emptyProfiles;

const BackgroundProfilesContext =
  createContext<readonly BackgroundProfile[] | null>(null);

export function BackgroundProfilesProvider({
  children,
  profiles = developmentProfiles,
}: {
  children: ReactNode;
  profiles?: readonly BackgroundProfile[];
}) {
  return (
    <BackgroundProfilesContext value={profiles}>
      {children}
    </BackgroundProfilesContext>
  );
}

export function useBackgroundProfiles() {
  const profiles = useContext(BackgroundProfilesContext);

  if (profiles === null) {
    throw new Error(
      "useBackgroundProfiles must be used within BackgroundProfilesProvider",
    );
  }

  return profiles;
}
