import Link from "next/link";
import { redirect } from "next/navigation";
import AdminOrganizationSelector from "../components/AdminOrganizationSelector";
import AdminEventForm from "../components/AdminEventForm";
import MvpNav from "../components/MvpNav";
import { summarizeAttendanceEntries } from "../data/attendance";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../data/activeOrganization";
import { resolveActiveAdminOrganizationContext } from "../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../data/currentUser.server";
import {
  getEventDateLabel,
  getEventLocationLabel,
  getEventTeamIds,
  getEventTimeLabel,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import { summarizeTransportationEntries } from "../data/transportation";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

export const dynamic = "force-dynamic";

type EventsHomeProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export default async function EventsHome({ searchParams }: EventsHomeProps) {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.claims.role;
  const requestedOrganizationId = getRequestedOrganizationId(
    (await searchParams)?.organizationId,
  );
  const activeContext =
    role === "admin"
      ? await resolveActiveAdminOrganizationContext(
          session,
          requestedOrganizationId,
        )
      : undefined;
  const activeOrganizationId = activeContext?.activeOrganizationId;
  const schedule = await getEventScheduleReadModel(role, activeOrganizationId);
  const organizationContext = activeContext?.activeOrganization
    ? { count: 1, label: activeContext.activeOrganization.name }
    : await getOrganizationContext(schedule.organizationIds);
  const repositories = schedule.source === "firestore"
    ? createFirestoreRepositories()
    : null;
  const visibleEvents = schedule.events;
  const [attendanceLists, transportationLists] = repositories
    ? await Promise.all([
        Promise.all(
          visibleEvents.map((event) =>
            repositories.attendance.listByEventId(event.id),
          ),
        ),
        Promise.all(
          visibleEvents.map((event) =>
            repositories.transportation.listByEventId(event.id),
          ),
        ),
      ])
    : [[], []];
  const teamsById = new Map(schedule.teams.map((team) => [team.id, team]));
  const attendanceByEventId = new Map(
    visibleEvents.map((event, index) => [
      event.id,
      attendanceLists[index] ?? [],
    ]),
  );
  const transportationByEventId = new Map(
    visibleEvents.map((event, index) => [
      event.id,
      transportationLists[index] ?? [],
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav
          activeOrganizationId={activeOrganizationId}
          organizationContext={organizationContext}
        />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="mt-3 text-sm text-slate-300">
            Upcoming practices, tournaments, and meetings.
          </p>
          <a
            href={withActiveOrganization(
              "/calendar.ics",
              activeOrganizationId,
            )}
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
          >
            Subscribe Calendar
          </a>
        </div>

        {activeContext && (
          <AdminOrganizationSelector
            action="/events"
            activeOrganizationId={activeOrganizationId}
            organizations={activeContext.organizations}
          />
        )}

        {role === "admin" && activeOrganizationId && (
          <AdminEventForm
            activeOrganizationId={activeOrganizationId}
            canCreateEvents={schedule.canCreateEvents}
            teams={schedule.teams}
          />
        )}

        <div className="mt-6 space-y-4">
          {visibleEvents.length === 0 && (
            <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
              {activeContext?.requiresSelection
                ? "Choose an organization to view its schedule."
                : "No events are scheduled for your current organization and team scope."}
            </p>
          )}
          {visibleEvents.map((event) => {
            const eventTeams = getEventTeamIds(event)
              .map((teamId) => teamsById.get(teamId))
              .filter(Boolean);
            const attendance = summarizeAttendanceEntries(
              event.id,
              attendanceByEventId.get(event.id) ?? [],
            );
            const transportation = summarizeTransportationEntries(
              event.id,
              transportationByEventId.get(event.id) ?? [],
            );
            const hasTransportationIssue = transportation.needsRide > 0;

            return (
              <Link
                key={event.id}
                href={withActiveOrganization(
                  `/events/${event.id}`,
                  activeOrganizationId,
                )}
                className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {event.type}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{event.title}</h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      hasTransportationIssue
                        ? "bg-red-500/20 text-red-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {hasTransportationIssue ? "Ride Help" : "On Track"}
                  </span>
                </div>

                <p className="mt-3 text-sm text-slate-400">
                  {eventTeams.map((team) => team?.name).join(", ") ||
                    "Organization"}
                </p>
                <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                  <p>{getEventDateLabel(event)}</p>
                  <p className="mt-1">{getEventTimeLabel(event)}</p>
                  <p className="mt-3">{getEventLocationLabel(event)}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Attendance</p>
                    <p className="mt-1 font-semibold text-blue-300">
                      {attendance.attending} Attending
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Transportation</p>
                    <p
                      className={`mt-1 font-semibold ${
                        hasTransportationIssue ? "text-red-300" : "text-blue-300"
                      }`}
                    >
                      {transportation.needsRide} Need Ride
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
