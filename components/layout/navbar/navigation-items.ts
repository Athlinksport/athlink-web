import type { LucideIcon } from "lucide-react";
import { Compass, LayoutDashboard, UserRound, UsersRound } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchChildren?: boolean;
};

export const navigationItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Connections", href: "/connections", icon: UsersRound },
  { label: "Profile", href: "/profile", icon: UserRound, matchChildren: true },
] satisfies readonly NavigationItem[];

export function isNavigationItemActive(item: NavigationItem, pathname: string) {
  return item.matchChildren
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : pathname === item.href;
}
