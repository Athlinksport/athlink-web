"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (process.env.NODE_ENV === "development") console.error(error); }, [error]);
  return <main className="grid min-h-[70svh] place-items-center px-4"><section className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center"><h1 className="text-2xl font-bold">Something went wrong</h1><p className="mt-3 text-muted-foreground">The page could not be loaded. Your request was not lost intentionally.</p><Button className="mt-6" onClick={reset}>Try again</Button></section></main>;
}
