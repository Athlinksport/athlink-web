"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import AppNavbar from "@/components/AppNavbar";
import { AnimatedBackground } from "@/components/background/AnimatedBackground";
import { AppShell } from "@/components/layout/app-shell";
import { RouteContentTransition } from "@/components/layout/route-content-transition";
import { AuthProvider } from "@/components/providers/auth-provider";

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

  if (!isApplicationRoute(pathname)) return children;

  return (
    <AuthProvider>
      <AppShell className="text-white">
        <AnimatedBackground />
        <div className="relative z-10 flex min-h-svh flex-col">
          <AppNavbar />
          <RouteContentTransition>{children}</RouteContentTransition>
        </div>
      </AppShell>
    </AuthProvider>
  );
}
