import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile", description: "Manage your Athlink athlete profile." };

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
