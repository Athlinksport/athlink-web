import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-2xl font-bold tracking-tight">
          Athlink
        </div>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a className="transition hover:text-white" href="#how-it-works">
            How it works
          </a>

          <a className="transition hover:text-white" href="#rooms">
            Rooms
          </a>

          <a className="transition hover:text-white" href="#safety">
            Safety
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
  href="/login"
  className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
>
  Log in
</Link>

          <Link
  href="/register"
  className="rounded-full bg-lime-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-lime-300"
>
  Join Athlink
</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-lime-400/30 bg-lime-400/10 px-4 py-2 text-sm text-lime-300">
            Find your sports community
          </div>

          <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Find people who
            <span className="text-lime-400"> move like you.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Discover sports partners, join local teams and create activities
            with people near you.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
  href="/register"
  className="rounded-full bg-lime-400 px-7 py-4 text-center font-semibold text-slate-950 transition hover:bg-lime-300"
>
  Find a sports partner
</Link>

            <Link
  href="/rooms"
  className="rounded-full border border-white/20 px-7 py-4 font-semibold transition hover:bg-white/10"
>
  Explore rooms
</Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-slate-400">
            <span>✓ Free to join</span>
            <span>✓ Local activities</span>
            <span>✓ Safe community</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-lime-400/20 blur-3xl" />

          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Activity near you</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Running in Toulouse
                </h2>
              </div>

              <div className="rounded-full bg-lime-400/15 px-3 py-1 text-sm text-lime-300">
                3 km away
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lime-400 text-2xl">
                  🏃
                </div>

                <div>
                  <h3 className="font-semibold">Canal du Midi Run</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Sunday · 9:00 AM · Intermediate
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-lg font-semibold">8 km</p>
                  <p className="text-xs text-slate-400">Distance</p>
                </div>

                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-lg font-semibold">6</p>
                  <p className="text-xs text-slate-400">Members</p>
                </div>

                <div className="rounded-xl bg-white/5 p-3">
                  <p className="text-lg font-semibold">2</p>
                  <p className="text-xs text-slate-400">Spots left</p>
                </div>
              </div>

              <button className="mt-6 w-full rounded-xl bg-white py-3 font-semibold text-slate-950 transition hover:bg-slate-200">
                Join this room
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-t border-white/10 bg-slate-900/50"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime-400">
              How it works
            </p>

            <h2 className="mt-4 text-4xl font-bold">
              Your next activity is three steps away
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Create your profile",
                description:
                  "Choose your sports, level, location and availability.",
              },
              {
                number: "02",
                title: "Find your people",
                description:
                  "Discover compatible athletes, teams and local rooms.",
              },
              {
                number: "03",
                title: "Move together",
                description:
                  "Chat, join an activity and enjoy your sport together.",
              },
            ].map((item) => (
              <article
                key={item.number}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <p className="text-sm font-semibold text-lime-400">
                  {item.number}
                </p>

                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>

                <p className="mt-3 leading-7 text-slate-400">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
