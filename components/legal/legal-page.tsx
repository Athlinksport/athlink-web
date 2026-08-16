import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="mx-auto w-full max-w-4xl px-4 py-12">
    <p className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100"><strong>Review draft:</strong> This page must be reviewed by a qualified legal professional before public launch.</p>
    <h1 className="mt-8 text-4xl font-bold">{title}</h1><p className="mt-3 text-lg text-muted-foreground">{description}</p>
    <div className="prose prose-invert mt-10 max-w-none space-y-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:leading-7 [&_p]:text-slate-300">{children}</div>
    <nav aria-label="Legal and safety pages" className="mt-12 flex flex-wrap gap-4 border-t border-white/10 pt-6 text-sm text-lime-300"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/safety">Safety</Link><Link href="/contact">Contact</Link></nav>
  </main>;
}
