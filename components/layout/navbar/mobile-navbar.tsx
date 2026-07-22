"use client";

import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

import { BrandLink } from "@/components/layout/navbar/brand-link";
import { NavLinks } from "@/components/layout/navbar/nav-links";
import type { NavigationItem } from "@/components/layout/navbar/navigation-items";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MobileNavbarProps = {
  items: readonly NavigationItem[];
  pathname: string;
  pendingRequestsCount: number;
  showLogout: boolean;
  onLogout: () => void;
};

export function MobileNavbar(props: MobileNavbarProps) {
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    setOpen(false);
    await props.onLogout();
  }

  return (
    <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 md:hidden">
      <BrandLink />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon-lg" aria-label="Open navigation menu" />}
        >
          <Menu aria-hidden="true" className="size-5" />
        </SheetTrigger>
        <SheetContent
          side="right"
          aria-label="Navigation menu"
          showCloseButton={false}
          className="w-[min(88vw,22rem)] border-border bg-background/95 backdrop-blur-xl"
        >
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Close navigation menu"
                className="absolute top-3.5 right-3.5"
              />
            }
          >
            <X aria-hidden="true" className="size-5" />
          </SheetClose>
          <SheetHeader className="border-b border-border px-5 py-5 pr-14">
            <SheetTitle><BrandLink /></SheetTitle>
            <SheetDescription>Navigate your Athlink account.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavLinks {...props} orientation="mobile" onNavigate={() => setOpen(false)} />
          </div>
          {props.showLogout && (
            <SheetFooter className="border-t border-border px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button variant="outline" size="lg" className="w-full justify-start" onClick={handleLogout}>
                <LogOut aria-hidden="true" data-icon="inline-start" />
                Log out
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
