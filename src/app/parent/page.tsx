import Link from "next/link";
import { redirect } from "next/navigation";
import BottomNav from "../components/BottomNav";
import ParentAthleteCard, {
  type ParentPlayerScheduleItem,
  type ParentPlayerStatus,
} from "../components/ParentAthleteCard";
import SessionControls from "../components/SessionControls";
import {
  getCurrentAuthSession,
  getCurrentParentUser,
} from "../data/currentUser.server";
import {
  eventHasTeamId,
  getEventDateLabel,
  getEventLocationLabel,
  getEventTimeLabel,
  isEventVisibleToNonAdmin,
  isUpcomingEvent,
  sortEventsByStartDate,
  type GameDayEvent,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import {
  getParentAthleteRegistrationReadModel,
  getRegistrationByAthlete,
} from "../data/parentAthleteRegistration.server";
import {
  getParentNextAction,
  type ParentNextAction,
} from "../data/parentDashboard";
import { getParentRegistrationInviteReadModels } from "../data/registrationInviteRead.server";
import {
  getRegistrationRosterStatus,
  hasPendingParentLifecycleRequest,
  isParentEventEligibleRegistration,
} from "../data/registrations";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

export const dynamic = "force-dynamic";

const parentEventDisplayTimeZone = "America/New_York";

function getEventStartDate(event: GameDayEvent) {
  const date = new Date(
    event.startsAt || event.startDateTime || event.date || "",
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: parentEventDisplayTimeZone,
    year: "numeric",
  }).format(date);
}

function isEventToday(event: GameDayEvent, now: Date) {
  const eventStartDate = getEventStartDate(event);

  if (!eventStartDate) {
    return false;
  }

  return getLocalDateKey(eventStartDate) === getLocalDateKey(now);
}

function isAccountAlert(action: ParentNextAction, athleteHref: string) {
  return (
    action.tone === "blocked" ||
    (action.tone === "attention" && action.href === athleteHref)
  );
}

function getPlayerStatus(
  action: ParentNextAction,
  athleteHref: string,
  scheduleEvents: GameDayEvent[],
  now: Date,
): ParentPlayerStatus {
  if (isAccountAlert(action, athleteHref)) {
    return {
      description: action.description,
      label: "Account alert",
      tone: "red",
    };
  }

  if (scheduleEvents.some((event) => isEventToday(event, now))) {
    return {
      description: "This player has something scheduled today.",
      label: "Today",
      tone: "green",
    };
  }

  if (scheduleEvents.length > 0) {
    return {
      description: "This player has upcoming scheduled events.",
      label: "Upcoming",
      tone: "yellow",
    };
  }

  return {
    description: "No upcoming schedule is posted for this player.",
    label: "No schedule",
    tone: "gray",
  };
}

function toPlayerScheduleItems(
  events: GameDayEvent[],
  now: Date,
): ParentPlayerScheduleItem[] {
  return events.slice(0, 3).map((event) => ({
    dateLabel: getEventDateLabel(event),
    href: `/events/${event.id}`,
    id: event.id,
    isToday: isEventToday(event, now),
    locationLabel: getEventLocationLabel(event),
    timeLabel: getEventTimeLabel(event),
    title: event.title,
  }));
}

export default async function ParentHome() {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentParentUser();

  if (currentUser.source !== "firebase-session") {
    redirect("/login");
  }

  const {
    athletes: parentAthletes,
    errorMessage,
    parent: currentParent,
    registrations,
    source,
  } = await getParentAthleteRegistrationReadModel(currentUser.parentId, {
    parentUid: currentUser.parentUid,
  });
  const schedule = await getEventScheduleReadModel("parent");
  const now = new Date();
  const upcomingScopedEvents = schedule.events
    .filter(
      (event) => isEventVisibleToNonAdmin(event) && isUpcomingEvent(event, now),
    )
    .slice()
    .sort(sortEventsByStartDate);
  const nextEventByAthleteId = new Map(
    parentAthletes.map((athlete) => {
      const registration = getRegistrationByAthlete(athlete, registrations);

      return [
        athlete.id,
        registration && isParentEventEligibleRegistration(registration)
          ? upcomingScopedEvents.find((event) =>
              eventHasTeamId(event, athlete.teamId),
            )
          : undefined,
      ];
    }),
  );
  const repositories = createFirestoreRepositories();
  const parentTeamIds = [
    ...new Set(
      [
        ...parentAthletes.map((athlete) => athlete.teamId),
        ...registrations.map((registration) => registration.teamId),
      ].filter(Boolean),
    ),
  ];
  const parentAthleteIdSet = new Set(
    parentAthletes.map((athlete) => athlete.id),
  );
  const teamNameById = new Map(
    schedule.teams.map((team) => [team.id, team.name]),
  );
  const [attendanceEntries, transportationEntries, teamMessageLists, inviteModels] =
    await Promise.all([
      Promise.all(
        parentAthletes.map((athlete) =>
          repositories.attendance.listByAthleteId(athlete.id),
        ),
      ).then((entryLists) => entryLists.flat()),
      Promise.all(
        parentAthletes.map((athlete) =>
          repositories.transportation.listByAthleteId(athlete.id),
        ),
      ).then((entryLists) => entryLists.flat()),
      Promise.all(
        parentTeamIds.map((teamId) =>
          repositories.messages.listByTeamId(teamId),
        ),
      ),
      getParentRegistrationInviteReadModels(),
    ]);
  const availableCurrentTeamInviteOptions = inviteModels
    .flatMap((model) =>
      model.invite && model.team
        ? [{ invite: model.invite, team: model.team }]
        : [],
    )
    .sort((first, second) =>
      first.team.name.localeCompare(second.team.name),
    );
  const addPlayerInviteOptions = [
    ...new Map(
      availableCurrentTeamInviteOptions.map((option) => [
        option.invite.teamId,
        option,
      ]),
    ).values(),
  ];
  const parentTeamMessages = [
    ...new Map(
      teamMessageLists
        .flat()
        .filter(
          (message) =>
            message.type === "Team Announcement" &&
            message.audience.includes("parent") &&
            (!message.recipientParentId ||
              message.recipientParentId === currentUser.parentId) &&
            (!message.recipientAthleteId ||
              parentAthleteIdSet.has(message.recipientAthleteId)),
        )
        .sort((first, second) =>
          second.timestamp.localeCompare(first.timestamp),
        )
        .map((message) => [message.id, message]),
    ).values(),
  ].slice(0, 3);
  const athleteRows = parentAthletes.map((athlete) => {
    const registration = getRegistrationByAthlete(athlete, registrations);
    const athleteHref = `/athletes/${athlete.id}`;
    const athleteScheduleEvents =
      registration && isParentEventEligibleRegistration(registration)
        ? upcomingScopedEvents.filter((event) =>
            eventHasTeamId(event, athlete.teamId),
          )
        : [];
    const nextEvent = nextEventByAthleteId.get(athlete.id);
    const attendanceStatus =
      attendanceEntries.find(
        (entry) =>
          entry.athleteId === athlete.id && entry.eventId === nextEvent?.id,
      )?.status ?? "Unknown";
    const transportationStatus =
      transportationEntries.find(
        (entry) =>
          entry.athleteId === athlete.id && entry.eventId === nextEvent?.id,
      )?.status ?? "Unknown";
    const nextAction = getParentNextAction({
      attendanceStatus,
      athleteHref,
      eventHref: nextEvent ? `/events/${nextEvent.id}` : undefined,
      hasPendingLifecycleRequest: registration
        ? hasPendingParentLifecycleRequest(registration)
        : false,
      hasRegistration: Boolean(registration),
      nextEvent: nextEvent ? { status: nextEvent.status } : undefined,
      paymentRequirements: registration?.paymentRequirements ?? [],
      registrationStatus: registration?.status ?? "Pending",
      requirements: registration?.requirements ?? [],
      rosterStatus: getRegistrationRosterStatus(registration),
      transportationStatus,
    });

    return {
      athlete,
      nextAction,
      scheduleItems: toPlayerScheduleItems(athleteScheduleEvents, now),
      status: getPlayerStatus(
        nextAction,
        athleteHref,
        athleteScheduleEvents,
        now,
      ),
      teamLabel: teamNameById.get(athlete.teamId) ?? athlete.teamId,
    };
  });
  const hasRegistrations = parentAthletes.length > 0 || registrations.length > 0;
  const parentDisplayName =
    currentParent.firstName || currentParent.name || "Parent";
  return (
    <main className="gd-dark-scope min-h-screen text-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <Link className="text-lg font-black" href="/parent">
            GameDay
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-black">
                {parentDisplayName}
              </span>
              <span className="block text-xs font-semibold text-slate-500">
                Parent
              </span>
            </span>
            <SessionControls compact role="parent" surface="light" />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-3 py-3 pb-20 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-blue-700">
              Parent Home
            </p>
            <h1 className="truncate text-xl font-black tracking-tight">
              Hi, {parentDisplayName}
            </h1>
          </div>
          {!hasRegistrations && (
            <Link
              className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
              href="/registration"
            >
              Find Team
            </Link>
          )}
        </div>

        {source === "error" && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-black">Parent dashboard could not load.</p>
            <p className="mt-2">
              {errorMessage ??
                "Refresh and try again. No local fallback data was loaded."}
            </p>
          </div>
        )}

        {source !== "error" && !hasRegistrations && (
          <section className="gd-card-light mt-3 rounded-lg p-3">
            <h2 className="text-lg font-black">Find your team</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Search open GameDay registrations by organization and team.
            </p>
            <Link
              className="mt-3 inline-flex rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"
              href="/registration"
            >
              Find open registration
            </Link>
          </section>
        )}

        {parentTeamMessages.length > 0 && (
          <details className="gd-card-light gd-card-interactive group mt-3 overflow-hidden rounded-lg">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-sm font-black">Messages</span>
                <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                  Team updates for your players.
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">
                  {parentTeamMessages.length}
                </span>
                <span className="text-sm font-black text-blue-700 transition group-open:rotate-90">
                  &gt;
                </span>
              </span>
            </summary>
            <div className="space-y-1.5 border-t border-slate-200 px-3 py-2.5">
              {parentTeamMessages.map((message) => (
                <article
                  className="rounded-md border border-blue-100/70 bg-white/70 p-2.5"
                  key={message.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black">{message.subject}</h3>
                    <span className="shrink-0 text-[11px] font-bold text-slate-500">
                      {teamNameById.get(message.teamId ?? "") ?? "Team"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">
                    {message.content}
                  </p>
                </article>
              ))}
            </div>
          </details>
        )}

        <section className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black">Players</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-500">
                {athleteRows.length}
              </p>
              {source !== "error" && hasRegistrations && (
                <details className="group relative" id="add-player">
                  <summary className="cursor-pointer list-none rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-black text-white/80 shadow-sm hover:bg-white/15 [&::-webkit-details-marker]:hidden">
                    Add player
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-1.5 rounded-lg border border-blue-300/25 bg-slate-950/95 p-2 text-white shadow-2xl shadow-blue-950/50 ring-1 ring-white/10 backdrop-blur">
                    <p className="px-1 text-[11px] font-bold text-slate-300">
                      Add to an existing team, or find a new one.
                    </p>
                    {addPlayerInviteOptions.length > 0 ? (
                      addPlayerInviteOptions.map(({ invite, team }) => (
                        <Link
                          className="flex items-center justify-between gap-3 rounded-md border border-blue-400/20 bg-blue-500/10 px-2.5 py-2 hover:bg-blue-500/20"
                          href={`/join/${invite.inviteCode}`}
                          key={invite.id}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-black">
                              {team.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-300">
                              Add another player
                            </span>
                          </span>
                          <span className="text-sm font-black text-blue-200">
                            &gt;
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-blue-300/30 bg-white/5 p-2.5 text-[11px] font-semibold text-slate-300">
                        No open links for your current teams.
                      </p>
                    )}
                    <Link
                      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
                      href="/registration"
                    >
                      <span>
                        <span className="block text-xs font-black">
                          Find another team
                        </span>
                        <span className="mt-0.5 block text-[11px] font-semibold text-slate-300">
                          Search or enter an invite code.
                        </span>
                      </span>
                      <span className="text-sm font-black text-blue-200">
                        &gt;
                      </span>
                    </Link>
                  </div>
                </details>
              )}
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {athleteRows.length === 0 ? (
              <p className="gd-card-light rounded-lg border-dashed p-3 text-sm font-semibold text-slate-500">
                No players registered yet.
              </p>
            ) : (
              athleteRows.map(
                ({ athlete, nextAction, scheduleItems, status, teamLabel }) => (
                  <ParentAthleteCard
                    athleteId={athlete.id}
                    athleteName={athlete.name}
                    key={athlete.id}
                    nextAction={nextAction}
                    scheduleItems={scheduleItems}
                    status={status}
                    teamLabel={teamLabel}
                  />
                ),
              )
            )}
          </div>
        </section>

        <BottomNav
          surface="light"
          items={
            hasRegistrations
              ? [
                  { href: "/parent", label: "Home" },
                  { href: "/events", label: "Schedule" },
                ]
              : [
                  { href: "/parent", label: "Home" },
                  { href: "/registration", label: "Find Team" },
                ]
          }
        />
      </section>
    </main>
  );
}
