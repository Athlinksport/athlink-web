"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import AppNavbar from "@/components/AppNavbar";
import { AnimatedBackground } from "@/components/background/AnimatedBackground";
import { AppShell } from "@/components/layout/app-shell";
import { RouteContentTransition } from "@/components/layout/route-content-transition";
import { AuthProvider } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const applicationRoutes = [
  "/dashboard",
  "/discover",
  "/groups",
  "/connections",
  "/messages",
  "/rooms",
  "/players",
  "/profile",
  "/settings",
  "/admin",
] as const;

function isApplicationRoute(pathname: string) {
  return applicationRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Keeps the authenticated application chrome and motion infrastructure alive
 * while the active App Router page changes.
 */
export function ApplicationFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isConversationRoute = /^\/rooms\/[^/]+$/.test(pathname);

  if (!isApplicationRoute(pathname)) return children;

  return (
    <AuthProvider>
      <AppShell
        className={cn(
          "text-white",
          isConversationRoute && "h-dvh min-h-0 overflow-hidden",
        )}
      >
        <AnimatedBackground />
        <div
          className={cn(
            "relative z-10 flex min-h-svh flex-col",
            isConversationRoute && "h-dvh min-h-0 overflow-hidden",
          )}
        >
          <AppNavbar />
          <RouteContentTransition constrainToViewport={isConversationRoute}>
            {children}
          </RouteContentTransition>
        </div>
      </AppShell>
    </AuthProvider>
  );
}
