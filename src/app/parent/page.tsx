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
  getEventTimeLabel,
  isEventVisibleToNonAdmin,
  isUpcomingEvent,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
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
  const [attendanceEntries, transportationEntries] = await Promise.all([
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
  ]);
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
      nextAction,
      nextEvent,
      registration,
    };
  });
  const hasRegistrations = parentAthletes.length > 0 || registrations.length > 0;
  const parentDisplayName =
    currentParent.firstName || currentParent.name || "Parent";
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
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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

      <section className="mx-auto max-w-2xl px-4 py-4 pb-24 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-blue-700">
              Parent Home
            </p>
            <h1 className="truncate text-2xl font-black tracking-tight">
              Hi, {parentDisplayName}
            </h1>
          </div>
          <Link
            className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
            href="/registration"
          >
            Find Team
          </Link>
        </div>

        {source === "error" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-black">Parent dashboard could not load.</p>
            <p className="mt-2">
              {errorMessage ??
                "Refresh and try again. No local fallback data was loaded."}
            </p>
          </div>
        )}

        {source !== "error" && !hasRegistrations && (
          <section className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <h2 className="text-xl font-black">Find your team</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Search open GameDay registrations by organization and team.
            </p>
            <Link
              className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
              href="/registration"
            >
              Find open registration
            </Link>
          </section>
        )}

        <section className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Players</h2>
            <p className="text-sm font-bold text-slate-500">
              {athleteRows.length}
            </p>
          </div>
          <div className="mt-2 space-y-2">
            {athleteRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">
                No players registered yet.
              </p>
            ) : (
              athleteRows.map(({ athlete, nextAction }) => (
                <ParentAthleteCard
                  athleteId={athlete.id}
                  athleteName={athlete.name}
                  key={athlete.id}
                  nextAction={nextAction}
                />
              ))
            )}
          </div>
        </section>

        {hasRegistrations && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Schedule</h2>
              <Link
                className="text-sm font-black text-blue-700"
                href="/events"
              >
                View all
              </Link>
            </div>

            <div className="mt-3 space-y-2">
              {scheduleRows.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                  No upcoming events.
                </p>
              ) : (
                scheduleRows.map(({ athleteNames, event }) => (
                  <Link
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 transition hover:border-blue-200 hover:bg-blue-50"
                    href={`/events/${event.id}`}
                    key={event.id}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">
                        {event.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                        {athleteNames.join(", ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs font-black text-slate-600">
                      {getEventDateLabel(event)}
                      <span className="block font-semibold">
                        {getEventTimeLabel(event)}
                      </span>
                    </span>
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
