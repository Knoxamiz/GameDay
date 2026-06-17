import Link from "next/link";
import { redirect } from "next/navigation";
import BottomNav from "../components/BottomNav";
import ParentAthleteCard from "../components/ParentAthleteCard";
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
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import {
  getParentAthleteRegistrationReadModel,
  getRegistrationByAthlete,
} from "../data/parentAthleteRegistration.server";
import { getParentNextAction } from "../data/parentDashboard";
import {
  getRegistrationRosterStatus,
  hasPendingParentLifecycleRequest,
  isParentEventEligibleRegistration,
} from "../data/registrations";
import { getLandingRouteForClaims } from "../infrastructure/auth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.claims.role !== "parent") {
    redirect(getLandingRouteForClaims(session.claims));
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
  const organizationContext = await getOrganizationContext(
    schedule.organizationIds,
  );
  const teamsById = new Map(schedule.teams.map((team) => [team.id, team]));
  const now = new Date();
  const upcomingScopedEvents = schedule.events.filter(
    (event) => isEventVisibleToNonAdmin(event) && isUpcomingEvent(event, now),
  );
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
  const organizationIds = [
    ...new Set(
      registrations
        .map((registration) => registration.organizationId)
        .filter(Boolean),
    ),
  ];
  const [attendanceEntries, transportationEntries, organizations] =
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
        organizationIds.map((organizationId) =>
          repositories.organizations.getById(organizationId),
        ),
      ),
    ]);
  const organizationsById = new Map(
    organizations.flatMap((organization) =>
      organization ? [[organization.id, organization]] : [],
    ),
  );
  const athleteRows = parentAthletes.map((athlete) => {
    const registration = getRegistrationByAthlete(athlete, registrations);
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
      athleteHref: `/athletes/${athlete.id}`,
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
      attendanceStatus,
      nextAction,
      nextEvent,
      registration,
      transportationStatus,
    };
  });
  const actionCount = athleteRows.filter(
    (row) =>
      row.nextAction.tone === "attention" || row.nextAction.tone === "blocked",
  ).length;
  const hasRegistrations = parentAthletes.length > 0 || registrations.length > 0;
  const parentDisplayName =
    currentParent.firstName || currentParent.name || "Parent";
  const playerAlerts = athleteRows.map((row) => ({
    athleteName: row.athlete.name,
    description: row.nextEvent
      ? [
          getEventDateLabel(row.nextEvent),
          getEventTimeLabel(row.nextEvent),
          getEventLocationLabel(row.nextEvent),
        ]
          .filter(Boolean)
          .join(" - ")
      : row.nextAction.description,
    href: `/athletes/${row.athlete.id}`,
    label: row.nextEvent
      ? row.nextEvent.title
      : row.nextAction.label,
    tone: row.nextAction.tone,
  }));
  const scheduleRows = upcomingScopedEvents
    .map((event) => {
      const athleteNames = athleteRows
        .filter((row) => {
          if (!row.registration || !isParentEventEligibleRegistration(row.registration)) {
            return false;
          }

          return eventHasTeamId(event, row.athlete.teamId);
        })
        .map((row) => row.athlete.name);

      return { athleteNames, event };
    })
    .filter((row) => row.athleteNames.length > 0)
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link className="text-xl font-black" href="/parent">
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

      <section className="mx-auto max-w-3xl px-4 py-5 pb-24 sm:px-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-blue-700">
            Parent Home
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Hi, {parentDisplayName}
          </h1>
          <p className="mt-2 text-base font-semibold text-slate-600">
            Your players and their next scheduled things.
          </p>
          {organizationContext && (
            <p className="mt-3 text-sm text-slate-500">
              {organizationContext.count === 1
                ? organizationContext.label
                : `Linked organizations: ${organizationContext.label}`}
            </p>
          )}
        </section>

        {source === "error" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <p className="font-black">Parent dashboard could not load.</p>
            <p className="mt-2">
              {errorMessage ??
                "Refresh and try again. No local fallback data was loaded."}
            </p>
          </div>
        )}

        {source !== "error" && !hasRegistrations && (
          <section className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-blue-700">
              First step
            </p>
            <h2 className="mt-2 text-2xl font-black">Find your team</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Search open GameDay registrations by organization and team. A QR
              code still works, but parents should not need one to get started.
            </p>
            <Link
              className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
              href="/registration"
            >
              Find open registration
            </Link>
          </section>
        )}

        {playerAlerts.length > 0 && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Player Alerts</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {actionCount > 0
                    ? `${actionCount} item${
                        actionCount === 1 ? "" : "s"
                      } need attention.`
                    : "Next scheduled things by player."}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {playerAlerts.map((alert) => (
                <Link
                  className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50 sm:flex-row sm:items-center sm:justify-between"
                  href={alert.href}
                  key={`${alert.athleteName}-${alert.label}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-black">
                      {alert.athleteName} - {alert.label}
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold text-slate-500">
                      {alert.description}
                    </span>
                  </span>
                  <span className="text-sm font-black text-blue-700">
                    Open
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Players</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Tap a player for options and details.
            </p>
          </div>
          <Link
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
            href="/registration"
          >
            Find Team
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {athleteRows.map(({ athlete, nextAction, nextEvent, registration }) => {
            const team = teamsById.get(athlete.teamId);
            const organizationId =
              registration?.organizationId ?? athlete.organizationId ?? "";
            const organizationName = organizationId
              ? organizationsById.get(organizationId)?.name ?? organizationId
              : undefined;

            return (
              <ParentAthleteCard
                athleteId={athlete.id}
                athleteName={athlete.name}
                key={athlete.id}
                nextAction={nextAction}
                nextEvent={
                  nextEvent
                    ? {
                        date: getEventDateLabel(nextEvent),
                        id: nextEvent.id,
                        location: getEventLocationLabel(nextEvent),
                        status: nextEvent.status,
                        time: getEventTimeLabel(nextEvent),
                        title: nextEvent.title,
                      }
                    : undefined
                }
                organizationName={organizationName}
                registrationStatus={registration?.status ?? "Pending"}
                rosterStatus={getRegistrationRosterStatus(registration)}
                teamDetail={[team?.division, team?.season]
                  .filter(Boolean)
                  .join(" / ")}
                teamName={team?.name ?? team?.label ?? athlete.teamId}
              />
            );
          })}
        </div>

        {hasRegistrations && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Schedule</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Upcoming events for your players.
                </p>
              </div>
              <Link
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-black text-white hover:bg-blue-700"
                href="/events"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 space-y-2">
              {scheduleRows.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  No upcoming events are scheduled for your registered players.
                </p>
              ) : (
                scheduleRows.map(({ athleteNames, event }) => (
                  <Link
                    className="block rounded-md border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-blue-50"
                    href={`/events/${event.id}`}
                    key={event.id}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <span className="min-w-0">
                        <span className="block truncate text-base font-black">
                          {event.title}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-slate-500">
                          {athleteNames.join(", ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-black text-slate-700">
                        {getEventDateLabel(event)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      {[getEventTimeLabel(event), getEventLocationLabel(event)]
                        .filter(Boolean)
                        .join(" - ")}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>
        )}

        <BottomNav
          surface="light"
          items={[
            { href: "/parent", label: "Home" },
            { href: "/events", label: "Schedule" },
            { href: "/registration", label: "Find Team" },
          ]}
        />
      </section>
    </main>
  );
}
