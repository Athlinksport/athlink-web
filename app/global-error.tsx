"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en" className="dark"><body className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white"><main className="max-w-md text-center"><h1 className="text-3xl font-bold">Athlink is temporarily unavailable</h1><p className="mt-3 text-slate-400">Please retry. If the problem continues, use the configured support contact.</p><button onClick={reset} className="mt-6 rounded-xl bg-lime-400 px-5 py-3 font-semibold text-slate-950">Retry</button></main></body></html>;
}
