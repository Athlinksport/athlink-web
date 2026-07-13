"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AppNavbarProps = {
  showLogout?: boolean;
};

const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "Discover",
    href: "/discover",
  },
  {
    label: "Rooms",
    href: "/rooms",
  },
  {
    label: "Profile",
    href: "/profile",
  },
];

export default function AppNavbar({
  showLogout = true,
}: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  function isActive(href: string) {
    if (href === "/profile") {
      return pathname.startsWith("/profile");
    }

    return pathname === href;
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-white/10 bg-slate-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          href="/dashboard"
          className="text-2xl font-bold tracking-tight text-white"
        >
          Athlink
        </Link>

        <nav className="flex items-center gap-5 text-sm text-slate-300">
          {navigationItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "font-medium text-white"
                    : "transition hover:text-white"
                }
              >
                {item.label}
              </Link>
            );
          })}

          {showLogout && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/15 px-4 py-2 transition hover:bg-white/10 hover:text-white"
            >
              Log out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}