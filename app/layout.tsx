import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApplicationFrame } from "@/components/layout/application-frame";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Athlink", template: "%s | Athlink" },
  description: "Connect with athletes, training partners, and sports communities.",
  applicationName: "Athlink",
  openGraph: { type: "website", siteName: "Athlink", title: "Athlink", description: "Connect with athletes, training partners, and sports communities." },
  twitter: { card: "summary", title: "Athlink", description: "Connect with athletes, training partners, and sports communities." },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("dark h-full antialiased")}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <TooltipProvider>
          <ApplicationFrame>{children}</ApplicationFrame>
        </TooltipProvider>
      </body>
    </html>
  );
}
