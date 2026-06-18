import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "./data/currentUser.server";
import { getLandingRouteForSession } from "./data/sessionAccess.server";

export const dynamic = "force-dynamic";

const navItems = [
  "For Organizations",
  "For Coaches",
  "For Parents",
  "Features",
  "Help",
];

const featureCards = [
  {
    description: "Streamline sign-ups, payments, waivers, and player needs.",
    icon: "people",
    title: "Registrations",
  },
  {
    description: "Manage rosters, roles, and player info in one place.",
    icon: "team",
    title: "Team Management",
  },
  {
    description: "Send important updates and keep everyone informed.",
    icon: "megaphone",
    title: "Alerts & Announcements",
  },
  {
    description: "Organize games, practices, and events without the mess.",
    icon: "calendar",
    title: "Schedules",
  },
];

const scheduleRows = [
  ["MAY", "24", "10:00 AM", "Central City Hoops"],
  ["MAY", "25", "1:30 PM", "Northside Elite"],
  ["MAY", "31", "11:00 AM", "Westview Warriors"],
];

function LogoMark() {
  return (
    <span className="flex items-center gap-3">
      <span className="relative flex size-10 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_28px_rgba(37,99,235,0.65)]">
        <span className="absolute inset-1 rounded-md border border-blue-200/40" />
        <span className="text-xl font-black text-white">G</span>
      </span>
      <span className="text-2xl font-black tracking-wide text-white sm:text-3xl">
        GAMEDAY
      </span>
    </span>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MiniIcon({ name }: { name: string }) {
  const commonProps = {
    className: "size-6",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (name === "calendar") {
    return (
      <svg {...commonProps}>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect height="18" rx="2" width="18" x="3" y="4" />
      </svg>
    );
  }

  if (name === "megaphone") {
    return (
      <svg {...commonProps}>
        <path d="m3 11 18-5v12L3 13v-2Z" />
        <path d="M11 14v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="absolute -right-14 bottom-4 hidden size-52 rounded-full border border-blue-300/20 bg-[radial-gradient(circle_at_35%_35%,#334155_0,#111827_38%,#020617_72%)] shadow-[0_0_80px_rgba(37,99,235,0.4)] lg:block">
        <div className="absolute left-1/2 top-0 h-full w-px bg-blue-200/15" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-blue-200/15" />
        <div className="absolute inset-8 rounded-full border border-blue-200/10" />
      </div>

      <div className="relative rounded-3xl border border-blue-300/25 bg-slate-950/90 p-4 shadow-[0_0_70px_rgba(29,78,216,0.45)] backdrop-blur">
        <div className="grid gap-4 lg:grid-cols-[150px_1fr]">
          <aside className="hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-3 lg:block">
            <div className="mb-5 flex size-7 items-center justify-center rounded-md bg-blue-600 text-sm font-black">
              G
            </div>
            {["Home", "Teams", "Registrations", "Schedule", "Messages", "Reports"].map(
              (item, index) => (
                <div
                  className={`mb-2 rounded-lg px-3 py-3 text-sm font-bold ${
                    index === 0
                      ? "bg-blue-600/30 text-white"
                      : "text-slate-400"
                  }`}
                  key={item}
                >
                  {item}
                </div>
              ),
            )}
          </aside>

          <section className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2">
              <div>
                <h2 className="text-xl font-black text-white">
                  Good evening, Coach!
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Here is what is happening with your club.
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200">
                Kings Basketball Club
              </div>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white">Upcoming Games</h3>
                  <span className="text-xs font-black text-blue-400">
                    View all
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {scheduleRows.map(([month, day, time, opponent]) => (
                    <div
                      className="grid grid-cols-[54px_1fr] gap-3 border-b border-slate-800 pb-3 last:border-0 last:pb-0"
                      key={`${day}-${opponent}`}
                    >
                      <div className="rounded-lg bg-slate-950/80 p-2 text-center">
                        <p className="text-[10px] font-black text-slate-400">
                          {month}
                        </p>
                        <p className="text-xl font-black text-white">{day}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-400">
                          Sat {time}
                        </p>
                        <p className="truncate text-sm font-black text-white">
                          vs. {opponent}
                        </p>
                        <p className="text-xs text-slate-500">
                          Riverside Court
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white">Registrations</h3>
                  <span className="text-xs font-black text-blue-400">
                    View all
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-5">
                  <div className="flex size-28 items-center justify-center rounded-full border-[12px] border-blue-600 border-l-blue-950 bg-slate-950 text-center">
                    <span>
                      <span className="block text-3xl font-black text-white">
                        128
                      </span>
                      <span className="text-xs text-slate-400">Registered</span>
                    </span>
                  </div>
                  <div className="space-y-2 text-xs font-bold text-slate-300">
                    {["U12 Boys", "U12 Girls", "U14 Boys", "U16 Boys"].map(
                      (division, index) => (
                        <p className="flex items-center gap-2" key={division}>
                          <span
                            className={`size-2 rounded-full ${
                              index === 0 ? "bg-blue-400" : "bg-blue-700"
                            }`}
                          />
                          {division}
                        </p>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white">Alerts</h3>
                  <span className="text-xs font-black text-blue-400">
                    View all
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {["Weather update", "Team photos", "Payment received"].map(
                    (alert, index) => (
                      <div className="flex items-center gap-3" key={alert}>
                        <span
                          className={`flex size-8 items-center justify-center rounded-lg ${
                            index === 0
                              ? "bg-orange-500/15 text-orange-300"
                              : index === 1
                                ? "bg-blue-500/15 text-blue-300"
                                : "bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          !
                        </span>
                        <span>
                          <span className="block text-sm font-black text-white">
                            {alert}
                          </span>
                          <span className="text-xs text-slate-500">
                            Ready for review
                          </span>
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white">Announcements</h3>
                  <span className="text-xs font-black text-blue-400">
                    View all
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-blue-300/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.45),rgba(15,23,42,0.9))] p-4">
                  <p className="text-lg font-black text-white">
                    Championship weekend!
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-300">
                    Families have the schedule, roster updates, and next steps.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const session = await getCurrentAuthSession();

  if (session) {
    redirect(await getLandingRouteForSession(session));
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_30%,rgba(59,130,246,0.28),transparent_24%),radial-gradient(circle_at_56%_48%,rgba(37,99,235,0.22),transparent_32%),linear-gradient(110deg,#020713_0%,#020817_48%,#061528_100%)]" />
        <div className="absolute right-0 top-28 h-72 w-80 bg-[radial-gradient(circle,rgba(255,255,255,0.85)_0,rgba(147,197,253,0.45)_8%,rgba(37,99,235,0.18)_28%,transparent_70%)] blur-sm" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.95))]" />
      </div>

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link aria-label="GameDay home" href="/">
            <LogoMark />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-200 lg:flex">
            {navItems.map((item) => (
              <a className="flex items-center gap-2 hover:text-white" href="#features" key={item}>
                {item}
                <Chevron />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              className="hidden rounded-xl border border-white/20 px-6 py-3 text-sm font-black text-white hover:bg-white/10 sm:inline-flex"
              href="/login"
            >
              Log in
            </Link>
            <Link
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_0_30px_rgba(37,99,235,0.45)] hover:bg-blue-500 sm:px-7"
              href="/login"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100dvh-82px)] max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:py-16">
        <div className="max-w-2xl">
          <h1 className="max-w-2xl text-6xl font-black leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl">
            Run game day
            <span className="block text-blue-500">with confidence.</span>
          </h1>
          <div className="mt-8 h-1.5 w-14 rounded-full bg-blue-500" />
          <p className="mt-8 max-w-xl text-lg font-semibold leading-8 text-slate-300 sm:text-xl">
            GameDay is the all-in-one platform for youth sports organizations.
            Organize teams, simplify registrations, share updates, and keep
            families in the loop so everyone knows what matters next.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex min-h-14 items-center justify-center gap-4 rounded-xl bg-blue-600 px-8 text-base font-black text-white shadow-[0_0_40px_rgba(37,99,235,0.45)] hover:bg-blue-500"
              href="/login"
            >
              Sign up
              <span aria-hidden="true">-&gt;</span>
            </Link>
            <Link
              className="inline-flex min-h-14 items-center justify-center gap-4 rounded-xl border border-white/20 bg-white/5 px-8 text-base font-black text-white hover:bg-white/10"
              href="/login"
            >
              Log in
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>

          <div className="mt-8 grid gap-3 text-sm font-bold text-slate-400 sm:grid-cols-3">
            {["Secure & reliable", "Built for real teams", "Simple for families"].map(
              (item) => (
                <p className="flex items-center gap-2" key={item}>
                  <span className="flex size-5 items-center justify-center rounded-full border border-blue-400 text-blue-300">
                    ✓
                  </span>
                  {item}
                </p>
              ),
            )}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section
        className="relative z-10 mx-auto grid max-w-7xl gap-5 px-5 pb-10 sm:px-8 md:grid-cols-2 xl:grid-cols-4"
        id="features"
      >
        {featureCards.map((feature) => (
          <article
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur"
            key={feature.title}
          >
            <div className="flex size-14 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
              <MiniIcon name={feature.icon} />
            </div>
            <h2 className="mt-5 text-xl font-black text-white">
              {feature.title}
            </h2>
            <p className="mt-3 min-h-12 text-sm font-semibold leading-6 text-slate-400">
              {feature.description}
            </p>
            <Link
              className="mt-6 inline-flex items-center gap-2 text-sm font-black text-blue-400 hover:text-blue-300"
              href="/login"
            >
              Learn more
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
