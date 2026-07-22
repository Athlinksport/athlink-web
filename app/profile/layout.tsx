import type { ReactNode } from "react";

import AppNavbar from "@/components/AppNavbar";
import { AppShell } from "@/components/layout/app-shell";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell className="text-white">
      <AppNavbar />
      {children}
    </AppShell>
  );
}
