import { redirect } from "next/navigation";
import Link from "next/link";
import CoachTeamWorkspaceCreateForm from "../components/CoachTeamWorkspaceCreateForm";
import CoachTeamCard from "../components/CoachTeamCard";
import SessionControls from "../components/SessionControls";
import {
  getCoachTeamNextAction,
  getCoachTeamResponseSummary,
} from "../data/coachDashboard";
import type { GameDayMessage } from "../data/messages";
import { getCoachHomeReadModel } from "../data/coachRead.server";
import { getCurrentAuthSession } from "../data/currentUser.server";
import { getOrganizationContext } from "../data/organizationContext.server";

export const dynamic = "force-dynamic";

type CoachSidebarIconName = "calendar" | "home" | "team";

const coachSidebarItems: {
  href: string;
  icon: CoachSidebarIconName;
  label: string;
}[] = [
  { href: "/coach", icon: "home", label: "Home" },
  { href: "/events", icon: "calendar", label: "Schedule" },
  { href: "/teams", icon: "team", label: "Teams" },
];

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "C";
}

function CoachSidebarIcon({
  className = "size-5",
  name,
}: {
  className?: string;
  name: CoachSidebarIconName;
}) {
  const commonProps = {
    className,
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

  if (name === "team") {
    return (
      <svg {...commonProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function CoachSidebarLink({
  active = false,
  href,
  icon,
  label,
}: {
  active?: boolean;
  href: string;
  icon: CoachSidebarIconName;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-center gap-0 rounded-md px-3 py-2.5 text-sm font-semibold lg:justify-start lg:gap-3 ${
        active
          ? "bg-blue-600 text-white shadow-[0_0_24px_rgba(37,99,235,0.22)]"
          : "text-slate-400 hover:bg-white/10 hover:text-white"
      }`}
      href={href}
    >
      <CoachSidebarIcon className="size-4 shrink-0" name={icon} />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}

function getCoachMessageToneClass(priority: GameDayMessage["priority"]) {
  if (priority === "Critical") {
    return "border-red-300/35 bg-red-500/15 text-red-100";
  }

  if (priority === "Important") {
    return "border-orange-300/35 bg-orange-500/15 text-orange-100";
  }

  return "border-blue-300/25 bg-blue-500/10 text-blue-100";
}

export default async function CoachHome() {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const {
    coach: currentCoach,
    coachMessages,
    coachRosterRegistrations,
    coachTeamCards,
    coachTeams,
    errorMessage,
    source,
  } = await getCoachHomeReadModel();
  const organizationContext = await getOrganizationContext(
    coachTeams.map((team) => team.organizationId),
  );
  const organizationLabel =
    organizationContext?.label ?? "No assigned organization";
  const displayName =
    currentCoach.name || currentCoach.email || session.user.email || "Coach";
  const upcomingEventCount = coachTeamCards.reduce(
    (count, card) => count + (card.nextEvent ? 1 : 0),
    0,
  );
  const actionCount = coachTeamCards.filter((card) => {
    const nextAction = getCoachTeamNextAction({
      eventHref: card.nextEvent ? `/events/${card.nextEvent.id}` : undefined,
      nextEvent: card.nextEvent ? { status: card.nextEvent.status } : undefined,
      responseSummary: getCoachTeamResponseSummary({
        attendanceEntries: card.attendanceEntries,
        event: card.nextEvent,
        rosteredAthleteIds: card.registrations.map(
          (registration) => registration.athleteId,
        ),
        transportationEntries: card.transportationEntries,
      }),
      rosteredAthletes: card.registrations.length,
      teamHref: `/teams/${card.team.id}`,
    });

    return nextAction.tone === "attention";
  }).length;

  return (
    <main className="gd-dark-scope min-h-screen text-white">
      <div className="flex min-h-screen">
        <aside className="block w-14 shrink-0 border-r border-white/10 bg-slate-950/70 lg:w-60">
          <div className="flex h-16 items-center justify-center gap-2 border-b border-white/10 px-2 lg:justify-start lg:px-5">
            <Link
              aria-label="Back to Coach home"
              className="flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              href="/coach"
              title="Back to Coach home"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-blue-600 text-sm font-black text-white">
                G
              </span>
              <span className="hidden font-black text-white lg:inline">
                GameDay
              </span>
            </Link>
          </div>
          <nav className="space-y-1 px-2 py-3 lg:px-3">
            {coachSidebarItems.map((item) => (
              <CoachSidebarLink
                active={item.href === "/coach"}
                href={item.href}
                icon={item.icon}
                key={item.label}
                label={item.label}
              />
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="relative z-[500] flex min-h-12 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/70 px-3 backdrop-blur sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-400">
                Coach / {organizationLabel}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {coachMessages.length > 0 && (
                <details className="group relative">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-blue-300/25 bg-blue-500/10 px-2.5 py-1.5 text-xs font-black text-blue-100 shadow-sm hover:bg-blue-500/20 [&::-webkit-details-marker]:hidden">
                    Updates
                    <span className="rounded-full bg-blue-400/20 px-1.5 py-0.5 text-[10px]">
                      {coachMessages.length}
                    </span>
                  </summary>
                  <div className="absolute right-0 z-[540] mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-1.5 rounded-lg border border-blue-300/25 bg-slate-950/95 p-2 shadow-2xl shadow-blue-950/50 ring-1 ring-white/10 backdrop-blur">
                    {coachMessages.map((message) => {
                      const messageBody = (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="line-clamp-1 text-xs font-black text-white">
                              {message.subject}
                            </h2>
                            <span
                              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-black ${getCoachMessageToneClass(
                                message.priority,
                              )}`}
                            >
                              {message.priority}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-400">
                            {message.content}
                          </p>
                          {message.eventId && (
                            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              Open event
                            </p>
                          )}
                        </>
                      );

                      return message.eventId ? (
                        <Link
                          className="block rounded-md border border-white/10 bg-white/[0.04] p-2.5 transition hover:border-blue-300/35 hover:bg-blue-500/10"
                          href={`/events/${message.eventId}`}
                          key={message.id}
                        >
                          {messageBody}
                        </Link>
                      ) : (
                        <article
                          className="rounded-md border border-white/10 bg-white/[0.04] p-2.5"
                          key={message.id}
                        >
                          {messageBody}
                        </article>
                      );
                    })}
                  </div>
                </details>
              )}
              <SessionControls compact role="coach" surface="dark" />
              <div className="hidden items-center gap-3 sm:flex">
                <span className="flex size-8 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/15 text-xs font-black text-blue-100">
                  {getInitial(displayName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-white">
                    {displayName}
                  </span>
                  <span className="block text-xs text-slate-400">Coach</span>
                </span>
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-5xl px-3 py-4 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                  Coach command
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Roster, attendance, rides, and parent contact by team.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs font-black text-slate-300">
                <span className="rounded-full border border-blue-300/15 bg-white/[0.045] px-2.5 py-1">
                  {coachTeams.length} teams
                </span>
                <span className="rounded-full border border-blue-300/15 bg-white/[0.045] px-2.5 py-1">
                  {coachRosterRegistrations.length} players
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 ${
                    actionCount > 0
                      ? "border-orange-300/30 bg-orange-500/10 text-orange-100"
                      : "border-blue-300/20 bg-blue-500/10 text-blue-100"
                  }`}
                >
                  {actionCount} {actionCount === 1 ? "item" : "items"} need
                  attention
                </span>
              </div>
            </div>

            {upcomingEventCount > 0 && (
              <p className="mt-3 rounded-md border border-blue-300/20 bg-blue-500/10 p-2.5 text-xs font-semibold text-blue-100">
                {upcomingEventCount} assigned team
                {upcomingEventCount === 1 ? " has" : "s have"} an upcoming
                visible event.
              </p>
            )}

            <div className="mt-3 space-y-3">
              {source === "error" && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100 shadow-sm">
                  <p className="font-black">Coach dashboard could not load.</p>
                  <p className="mt-2">
                    {errorMessage ??
                      "Refresh and try again. No local fallback data was loaded."}
                  </p>
                </div>
              )}

              {source !== "error" && coachTeamCards.length === 0 && (
                <div className="gd-card-dark rounded-lg p-3 text-sm text-slate-300">
                  <p className="text-sm font-black text-white">
                    No team assigned yet.
                  </p>
                  <p className="mt-1 text-xs font-semibold">
                    Open only the path you need.
                  </p>

                  <div className="mt-2 grid gap-1.5">
                    <details className="group rounded-md border border-blue-300/20 bg-blue-500/10">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
                        <span>
                          <span className="block text-sm font-black text-white">
                            Create independent team
                          </span>
                          <span className="block text-[11px] font-semibold text-slate-400">
                            Free single-team workspace.
                          </span>
                        </span>
                        <span className="text-sm font-black text-blue-200 transition group-open:rotate-90">
                          &rsaquo;
                        </span>
                      </summary>
                      <div className="border-t border-blue-300/20 p-2">
                        <CoachTeamWorkspaceCreateForm />
                      </div>
                    </details>

                    <details className="group rounded-md border border-white/10 bg-white/[0.04]">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2.5 py-2 [&::-webkit-details-marker]:hidden">
                        <span>
                          <span className="block text-sm font-black text-white">
                            Already part of an organization?
                          </span>
                          <span className="block text-[11px] font-semibold text-slate-400">
                            Give this email to the org admin.
                          </span>
                        </span>
                        <span className="text-sm font-black text-blue-200 transition group-open:rotate-90">
                          &rsaquo;
                        </span>
                      </summary>
                      <div className="border-t border-white/10 p-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Coach login email
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-white">
                          {currentCoach.email ||
                            session.user.email ||
                            "Not available"}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          The admin adds this email from the team&apos;s
                          Players & Coaches screen.
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              )}

              {coachTeamCards.map((card) => (
                <CoachTeamCard key={card.team.id} card={card} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
