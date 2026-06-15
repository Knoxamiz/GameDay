import Link from "next/link";
import { redirect } from "next/navigation";
import ParentAthleteCard from "../components/ParentAthleteCard";
import BottomNav from "../components/BottomNav";
import MvpNav from "../components/MvpNav";
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <p className="text-sm font-semibold text-slate-400">Parent Home</p>
          <h1 className="mt-2 text-3xl font-bold">GameDay</h1>
          <p className="mt-3 text-sm text-slate-300">
            Your athletes, registration status, schedule, and next steps.
          </p>
        </div>

        <SessionControls role="parent" />

        <p className="mt-5 text-lg text-slate-300">
          Welcome, {currentParent.firstName}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Athletes</p>
            <p className="mt-1 text-lg text-white">{parentAthletes.length}</p>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Actions</p>
            <p
              className={`mt-1 text-lg ${
                actionCount > 0 ? "text-yellow-200" : "text-blue-300"
              }`}
            >
              {actionCount}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900 p-3">
            <p className="text-slate-400">Events</p>
            <p className="mt-1 text-lg text-white">
              {upcomingScopedEvents.length}
            </p>
          </div>
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
          My Athletes
        </h2>

        <div className="mt-4 space-y-3">
          {source === "error" && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
              <p className="font-semibold">Parent dashboard could not load.</p>
              <p className="mt-2">
                {errorMessage ??
                  "Refresh and try again. No local fallback data was loaded."}
              </p>
            </div>
          )}
          {source !== "error" && !hasRegistrations && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
              <p className="text-lg font-bold text-white">
                No athletes registered yet.
              </p>
              <p className="mt-3">
                Join a team with an invite link from your organization.
                Registration starts from a real <span className="font-semibold">/join/...</span>{" "}
                link.
              </p>
            </div>
          )}
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
                  .join(" - ")}
                teamName={team?.name ?? team?.label ?? athlete.teamId}
              />
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Schedule</h2>
          <p className="mt-3 text-sm text-slate-300">
            {upcomingScopedEvents.length === 0
              ? "No upcoming events are scheduled for your registered athletes."
              : `${upcomingScopedEvents.length} upcoming event${
                  upcomingScopedEvents.length === 1 ? "" : "s"
                } for your registered athletes.`}
          </p>
          <Link
            href={"/events"}
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            View Schedule
          </Link>
        </div>

        <BottomNav
          items={[
            { href: "/parent", label: "Home" },
            { href: "/events", label: "Schedule" },
            { href: "/registration", label: "Registration" },
          ]}
        />
      </section>
    </main>
  );
}
