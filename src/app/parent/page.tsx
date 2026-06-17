import Link from "next/link";
import { redirect } from "next/navigation";
import ParentAthleteCard from "../components/ParentAthleteCard";
import BottomNav from "../components/BottomNav";
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
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { getLandingRouteForClaims } from "../infrastructure/auth";

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
    parent: currentParent,
    registrations,
    source,
    errorMessage,
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
          ? upcomingScopedEvents.find(
              (event) =>
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
  const actionCount = athleteRows.filter((row) =>
    row.nextAction.tone === "attention" || row.nextAction.tone === "blocked",
  ).length;
  const hasRegistrations = parentAthletes.length > 0 || registrations.length > 0;
  const parentDisplayName =
    currentParent.firstName || currentParent.name || "Parent";
  const priorityRow =
    athleteRows.find(
      (row) =>
        row.nextAction.tone === "blocked" ||
        row.nextAction.tone === "attention",
    ) ?? athleteRows[0];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
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

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-blue-700">
              Parent Home
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Hi, {parentDisplayName}
            </h1>
            <p className="mt-2 max-w-2xl text-base font-semibold text-slate-600">
              Here is what each player needs right now.
            </p>
            {organizationContext && (
              <p className="mt-3 text-sm text-slate-500">
                {organizationContext.count === 1
                  ? organizationContext.label
                  : `Linked organizations: ${organizationContext.label}`}
              </p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-500">Family Snapshot</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Players</p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {parentAthletes.length}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Needs</p>
                <p
                  className={`mt-1 text-2xl font-black ${
                    actionCount > 0 ? "text-orange-600" : "text-emerald-600"
                  }`}
                >
                  {actionCount}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Events</p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {upcomingScopedEvents.length}
                </p>
              </div>
            </div>
          </section>
        </div>

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
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
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

        {priorityRow && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase text-slate-500">
              Needs Attention
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  {priorityRow.athlete.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {priorityRow.nextAction.label}:{" "}
                  {priorityRow.nextAction.description}
                </p>
              </div>
              {priorityRow.nextAction.href && (
                <Link
                  className="inline-flex shrink-0 rounded-md bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
                  href={priorityRow.nextAction.href}
                >
                  Open
                </Link>
              )}
            </div>
          </section>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Players</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Each card is scoped to one player.
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
          {athleteRows.map(
            ({
              athlete,
              attendanceStatus,
              nextEvent,
              registration,
              transportationStatus,
            }) => {
            const team = teamsById.get(athlete.teamId);
            const organizationId =
              registration?.organizationId ?? athlete.organizationId ?? "";
            const organizationName = organizationId
              ? organizationsById.get(organizationId)?.name ?? organizationId
              : undefined;

            return (
              <ParentAthleteCard
                key={athlete.id}
                athleteId={athlete.id}
                athleteName={athlete.name}
                hasPendingLifecycleRequest={
                  registration
                    ? hasPendingParentLifecycleRequest(registration)
                    : false
                }
                hasRegistration={Boolean(registration)}
                nextEvent={
                  nextEvent
                    ? {
                        date: getEventDateLabel(nextEvent),
                        directionsUrl: "",
                        id: nextEvent.id,
                        location: getEventLocationLabel(nextEvent),
                        status: nextEvent.status,
                        time: getEventTimeLabel(nextEvent),
                        title: nextEvent.title,
                      }
                    : undefined
                }
                organizationName={organizationName}
                initialTransportationStatus={transportationStatus}
                initialAttendanceStatus={attendanceStatus}
                paymentRequirements={registration?.paymentRequirements ?? []}
                registrationId={registration?.id ?? athlete.registrationId}
                registrationRequirements={registration?.requirements ?? []}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Family Schedule</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {upcomingScopedEvents.length === 0
                    ? "No upcoming events are scheduled for your registered players."
                    : `${upcomingScopedEvents.length} upcoming event${
                        upcomingScopedEvents.length === 1 ? "" : "s"
                      } for your registered players.`}
                </p>
              </div>
              <Link
                href="/events"
                className="inline-flex rounded-md bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                View Schedule
              </Link>
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
