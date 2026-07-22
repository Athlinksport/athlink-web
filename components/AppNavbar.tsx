"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DesktopNavbar } from "@/components/layout/navbar/desktop-navbar";
import { MobileNavbar } from "@/components/layout/navbar/mobile-navbar";
import { navigationItems } from "@/components/layout/navbar/navigation-items";
import { createClient } from "@/lib/supabase/client";

type AppNavbarProps = {
  showLogout?: boolean;
};

export default function AppNavbar({ showLogout = true }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    async function loadPendingRequestsCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setPendingRequestsCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      if (error) {
        console.error("Unable to load pending requests count:", error.message);
        return;
      }

      setPendingRequestsCount(count ?? 0);
    }

    loadPendingRequestsCount();
  }, [supabase, pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <DesktopNavbar
        items={navigationItems}
        pathname={pathname}
        pendingRequestsCount={pendingRequestsCount}
        showLogout={showLogout}
        onLogout={handleLogout}
      />
      <MobileNavbar
        items={navigationItems}
        pathname={pathname}
        pendingRequestsCount={pendingRequestsCount}
        showLogout={showLogout}
        onLogout={handleLogout}
      />
    </header>
  );
}
