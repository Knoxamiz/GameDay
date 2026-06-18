import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "./data/currentUser.server";
import { getLandingRouteForSession } from "./data/sessionAccess.server";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "#organizations", label: "For Organizations" },
  { href: "#coaches", label: "For Coaches" },
  { href: "#parents", label: "For Parents" },
  { href: "#features", label: "Features" },
  { href: "#help", label: "Help" },
];

const featureCards = [
  {
    description: "Streamline sign-ups, payments, waivers, and player needs.",
    href: "#organizations",
    icon: "people",
    title: "Registrations",
  },
  {
    description: "Manage rosters, roles, and player info in one place.",
    href: "#coaches",
    icon: "team",
    title: "Team Management",
  },
  {
    description: "Send important updates and keep everyone informed.",
    href: "#parents",
    icon: "megaphone",
    title: "Alerts & Announcements",
  },
  {
    description: "Organize games, practices, and events without the mess.",
    href: "#organizations",
    icon: "calendar",
    title: "Schedules",
  },
];

const getStartedCards = [
  {
    cta: "Create organization",
    description:
      "Start a paid workspace for a club, league, or multi-team organization.",
    href: "/signup?intent=organization",
    title: "Organization",
  },
  {
    cta: "Create team",
    description:
      "Start one free team workspace, roster players, and invite parents.",
    href: "/signup?intent=team",
    title: "Single team",
  },
  {
    cta: "Find registration",
    description:
      "Parents join a real team or organization through registration.",
    href: "/registration",
    title: "Parent / Player",
  },
];

const scheduleRows = [
  ["MAY", "24", "10:00 AM", "Central City Hoops"],
  ["MAY", "25", "1:30 PM", "Northside Elite"],
  ["MAY", "31", "11:00 AM", "Westview Warriors"],
];

function LogoMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex size-8 items-center justify-center rounded-lg bg-blue-600 shadow-[0_0_24px_rgba(37,99,235,0.6)]">
        <span className="absolute inset-1 rounded-md border border-blue-200/40" />
        <span className="text-base font-black text-white">G</span>
      </span>
      <span className="text-xl font-black tracking-wide text-white sm:text-2xl">
        GAMEDAY
      </span>
    </span>
  );
}

function MiniIcon({ name }: { name: string }) {
  const commonProps = {
    className: "size-5",
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
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -right-12 bottom-4 hidden size-44 rounded-full border border-blue-300/20 bg-[radial-gradient(circle_at_35%_35%,#334155_0,#111827_38%,#020617_72%)] shadow-[0_0_70px_rgba(37,99,235,0.35)] lg:block">
        <div className="absolute left-1/2 top-0 h-full w-px bg-blue-200/15" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-blue-200/15" />
        <div className="absolute inset-8 rounded-full border border-blue-200/10" />
      </div>

      <div className="relative rounded-2xl border border-blue-300/25 bg-slate-950/90 p-3 shadow-[0_0_56px_rgba(29,78,216,0.38)] backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[132px_1fr]">
          <aside className="hidden rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 lg:block">
            <div className="mb-4 flex size-6 items-center justify-center rounded-md bg-blue-600 text-xs font-black">
              G
            </div>
            {["Home", "Teams", "Registrations", "Schedule", "Messages", "Reports"].map(
              (item, index) => (
                <div
                  className={`mb-1.5 rounded-lg px-2.5 py-2 text-xs font-bold ${
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
                <h2 className="text-lg font-black text-white">
                  Good evening, Coach!
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Here is what is happening with your club.
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs font-bold text-slate-200">
                Kings Basketball Club
              </div>
            </div>

            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white">Upcoming Games</h3>
                  <span className="text-xs font-black text-blue-400">
                    Preview
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {scheduleRows.map(([month, day, time, opponent]) => (
                    <div
                      className="grid grid-cols-[48px_1fr] gap-3 border-b border-slate-800 pb-3 last:border-0 last:pb-0"
                      key={`${day}-${opponent}`}
                    >
                      <div className="rounded-lg bg-slate-950/80 p-2 text-center">
                        <p className="text-[10px] font-black text-slate-400">
                          {month}
                        </p>
                        <p className="text-lg font-black text-white">{day}</p>
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

              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white">Registrations</h3>
                  <span className="text-xs font-black text-blue-400">
                    Preview
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex size-24 items-center justify-center rounded-full border-[10px] border-blue-600 border-l-blue-950 bg-slate-950 text-center">
                    <span>
                      <span className="block text-2xl font-black text-white">
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

              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white">Alerts</h3>
                  <span className="text-xs font-black text-blue-400">
                    Preview
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {["Weather update", "Team photos", "Payment received"].map(
                    (alert, index) => (
                      <div className="flex items-center gap-3" key={alert}>
                        <span
                          className={`flex size-7 items-center justify-center rounded-lg ${
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
                          <span className="block text-xs font-black text-white">
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

              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white">Announcements</h3>
                  <span className="text-xs font-black text-blue-400">
                    Preview
                  </span>
                </div>
                <div className="mt-3 rounded-xl border border-blue-300/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.45),rgba(15,23,42,0.9))] p-3">
                  <p className="text-base font-black text-white">
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link aria-label="GameDay home" href="/">
            <LogoMark />
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-200 lg:flex">
            {navItems.map((item) => (
              <a
                className="hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              className="hidden rounded-lg border border-white/20 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 sm:inline-flex"
              href="/login"
            >
              Log in
            </Link>
            <Link
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-[0_0_26px_rgba(37,99,235,0.42)] hover:bg-blue-500 sm:px-5"
              href="/signup"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100dvh-72px)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:py-12">
        <div className="max-w-2xl">
          <h1 className="max-w-2xl text-3xl font-black leading-[0.95] tracking-tight text-white sm:text-4xl lg:text-5xl">
            Run game day
            <span className="block text-blue-500">with confidence.</span>
          </h1>
          <div className="mt-6 h-1 w-12 rounded-full bg-blue-500" />
          <p className="mt-6 max-w-xl text-base font-semibold leading-7 text-slate-300 sm:text-lg">
            GameDay is the all-in-one platform for youth sports organizations.
            Organize teams, simplify registrations, share updates, and keep
            families in the loop so everyone knows what matters next.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-blue-600 px-6 text-sm font-black text-white shadow-[0_0_34px_rgba(37,99,235,0.42)] hover:bg-blue-500"
              href="/signup"
            >
              Sign up
              <span aria-hidden="true">-&gt;</span>
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/5 px-6 text-sm font-black text-white hover:bg-white/10"
              href="/login"
            >
              Log in
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>

          <div className="mt-6 grid gap-3 text-xs font-bold text-slate-400 sm:grid-cols-3">
            {["Secure & reliable", "Built for real teams", "Simple for families"].map(
              (item) => (
                <p className="flex items-center gap-2" key={item}>
                  <span className="flex size-5 items-center justify-center rounded-full border border-blue-400 text-[10px] text-blue-300">
                    OK
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
        className="relative z-10 mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 md:grid-cols-2 xl:grid-cols-4"
        id="features"
      >
        {featureCards.map((feature) => (
          <article
            className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur"
            key={feature.title}
          >
            <div className="flex size-11 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
              <MiniIcon name={feature.icon} />
            </div>
            <h2 className="mt-4 text-lg font-black text-white">
              {feature.title}
            </h2>
            <p className="mt-2 min-h-10 text-sm font-semibold leading-5 text-slate-400">
              {feature.description}
            </p>
            <Link
              className="mt-5 inline-flex items-center gap-2 text-sm font-black text-blue-400 hover:text-blue-300"
              href={feature.href}
            >
              Learn more
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </article>
        ))}
      </section>

      <section
        className="relative z-10 mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-3"
        id="get-started"
      >
        <div className="rounded-xl border border-blue-400/20 bg-blue-600/10 p-4 shadow-2xl backdrop-blur lg:col-span-3">
          <p className="text-sm font-black uppercase tracking-wide text-blue-300">
            Get Started
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Choose who is creating the workspace.
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-5 text-slate-300">
            Organization owners create paid orgs. Coaches can create one free
            team. Parents join through registration.
          </p>
        </div>

        {getStartedCards.map((card) => (
          <Link
            className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur hover:border-blue-400/40 hover:bg-blue-500/10"
            href={card.href}
            key={card.title}
          >
            <h3 className="text-lg font-black text-white">{card.title}</h3>
            <p className="mt-2 min-h-12 text-sm font-semibold leading-5 text-slate-400">
              {card.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-400">
              {card.cta}
              <span aria-hidden="true">-&gt;</span>
            </span>
          </Link>
        ))}
      </section>

      <section
        className="relative z-10 mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-3"
        id="organizations"
      >
        <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur lg:col-span-2">
          <p className="text-sm font-black uppercase tracking-wide text-blue-300">
            For Organizations
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            One club, one workspace, every team separated cleanly.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            Admins open the organization, manage teams, publish registration
            links, post schedules, and keep roster issues in one place without
            mixing data between clubs.
          </p>
        </article>
        <Link
          className="rounded-xl border border-blue-400/20 bg-blue-600/10 p-4 shadow-2xl backdrop-blur hover:bg-blue-500/20"
          href="/signup?intent=organization"
        >
          <h3 className="text-lg font-black text-white">
            Open organization tools
          </h3>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-300">
            Sign up to create or manage an organization workspace.
          </p>
          <span className="mt-4 inline-flex text-sm font-black text-blue-300">
            Start organization -&gt;
          </span>
        </Link>
      </section>

      <section
        className="relative z-10 mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-2"
        id="coaches"
      >
        <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur">
          <p className="text-sm font-black uppercase tracking-wide text-blue-300">
            For Coaches
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Roster first, schedule next, parents informed.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            Coaches get assigned team access, roster context, event responses,
            and parent contact visibility without needing the full admin setup
            screen.
          </p>
        </article>
        <Link
          className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur hover:border-blue-400/40 hover:bg-blue-500/10"
          href="/signup?intent=team"
        >
          <h3 className="text-lg font-black text-white">
            Create or open a team
          </h3>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-400">
            Sign in, then GameDay opens your coach team or lets you create one.
          </p>
          <span className="mt-4 inline-flex text-sm font-black text-blue-400">
            Continue -&gt;
          </span>
        </Link>
      </section>

      <section
        className="relative z-10 mx-auto grid max-w-6xl gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-2"
        id="parents"
      >
        <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur">
          <p className="text-sm font-black uppercase tracking-wide text-blue-300">
            For Parents
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Know exactly what your player needs now.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            Parent screens stay player-focused: next event, attendance,
            transportation, missing requirements, and registration status only
            when those things matter.
          </p>
        </article>
        <Link
          className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur hover:border-blue-400/40 hover:bg-blue-500/10"
          href="/registration"
        >
          <h3 className="text-lg font-black text-white">Find a team</h3>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-400">
            Open the live registration path for parents and players.
          </p>
          <span className="mt-4 inline-flex text-sm font-black text-blue-400">
            Find registration -&gt;
          </span>
        </Link>
      </section>

      <section
        className="relative z-10 mx-auto max-w-6xl px-4 pb-12 sm:px-6"
        id="help"
      >
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur">
          <p className="text-sm font-black uppercase tracking-wide text-blue-300">
            Help
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Need to get into the right place?
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
            Use Log in if you already have an account. Use Find registration if
            you are a parent joining a team. Use Sign up when you need to create
            a paid organization or free single-team workspace.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-black text-white hover:bg-blue-500"
              href="/signup"
            >
              Sign up
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-black text-white hover:bg-white/10"
              href="/registration"
            >
              Find registration
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
