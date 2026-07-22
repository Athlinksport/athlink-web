import { LogOut } from "lucide-react";

import { BrandLink } from "@/components/layout/navbar/brand-link";
import { NavLinks } from "@/components/layout/navbar/nav-links";
import type { NavigationItem } from "@/components/layout/navbar/navigation-items";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

type DesktopNavbarProps = {
  items: readonly NavigationItem[];
  pathname: string;
  pendingRequestsCount: number;
  showLogout: boolean;
  onLogout: () => void;
};

export function DesktopNavbar(props: DesktopNavbarProps) {
  return (
    <div className="mx-auto hidden h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 md:grid">
      <BrandLink className="justify-self-start" />
      <Surface variant="glass" className="rounded-2xl border-border/70 px-1.5 py-1">
        <NavLinks {...props} orientation="desktop" />
      </Surface>
      <div className="justify-self-end">
        {props.showLogout && (
          <Button variant="ghost" size="sm" onClick={props.onLogout} aria-label="Log out of Athlink">
            <LogOut aria-hidden="true" data-icon="inline-start" />
            Log out
          </Button>
        )}
      </div>
    </div>
  );
}
