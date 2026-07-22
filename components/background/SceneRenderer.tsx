"use client";

import { usePathname } from "next/navigation";

import { ConnectionsScene } from "./scenes/connections";
import { DashboardScene } from "./scenes/dashboard";
import { DiscoverScene } from "./scenes/discover";
import { MessagesScene } from "./scenes/messages";
import { ProfileScene } from "./scenes/profile";
import type { SceneDefinition } from "./scenes/shared";

const scenes: readonly SceneDefinition[] = [
  { matches: (pathname) => pathname === "/dashboard", Component: DashboardScene },
  { matches: (pathname) => pathname === "/discover", Component: DiscoverScene },
  { matches: (pathname) => pathname.startsWith("/messages/"), Component: MessagesScene },
  { matches: (pathname) => pathname === "/profile" || pathname.startsWith("/profile/"), Component: ProfileScene },
  { matches: (pathname) => pathname === "/connections", Component: ConnectionsScene },
];

/** Resolves and mounts exactly one scene for the current application route. */
export function SceneRenderer() {
  const pathname = usePathname();
  const scene = scenes.find(({ matches }) => matches(pathname));

  if (!scene) return null;

  const ActiveScene = scene.Component;
  return <ActiveScene />;
}
