"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import {
  isNavigationItemActive,
  type NavigationItem,
} from "@/components/layout/navbar/navigation-items";
import { cn } from "@/lib/utils";

type NavLinksProps = {
  items: readonly NavigationItem[];
  pathname: string;
  pendingRequestsCount: number;
  orientation: "desktop" | "mobile";
  onNavigate?: () => void;
};

export function NavLinks({
  items,
  pathname,
  pendingRequestsCount,
  orientation,
  onNavigate,
}: NavLinksProps) {
  const reduceMotion = useReducedMotion();

  return (
    <nav aria-label={orientation === "desktop" ? "Primary navigation" : "Mobile navigation"}>
      <ul className={cn("flex", orientation === "desktop" ? "items-center gap-1" : "flex-col gap-1")}>
        {items.map((item) => {
          const active = isNavigationItemActive(item, pathname);
          const Icon = item.icon;
          const showCount = item.href === "/connections" && pendingRequestsCount > 0;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center rounded-xl text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  orientation === "desktop" ? "h-9 gap-2 px-3" : "min-h-12 gap-3 px-4 text-base",
                  active && "text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`navbar-active-${orientation}`}
                    aria-hidden="true"
                    className={cn(
                      "absolute bg-primary/80",
                      orientation === "desktop"
                        ? "inset-x-3 -bottom-[9px] h-0.5 rounded-full shadow-[0_0_12px_var(--primary)]"
                        : "inset-y-2 left-0 w-0.5 rounded-full",
                    )}
                    transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon aria-hidden="true" className={cn("size-4", orientation === "mobile" && "size-5")} />
                <span>{item.label}</span>
                {showCount && (
                  <span
                    aria-label={`${pendingRequestsCount} pending connection requests`}
                    className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary"
                  >
                    {pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
