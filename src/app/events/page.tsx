import Link from "next/link";
import { redirect } from "next/navigation";
import AdminAppShell from "../components/AdminAppShell";
import AdminEventForm from "../components/AdminEventForm";
import AdminEventLifecycleManager from "../components/AdminEventLifecycleManager";
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
  getEventStatusLabel,
  getEventTeamIds,
  getEventTimeLabel,
  isArchivedEvent,
  isUpcomingEvent,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import { getOrganizationContext } from "../data/organizationContext.server";
import { resolveSessionAccessRole } from "../data/sessionAccess.server";
import { summarizeTransportationEntries } from "../data/transportation";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

export const dynamic = "force-dynamic";

type EventsHomeProps = {
  adminRouteBase?: boolean;
  searchParams?: Promise<{
    action?: string | string[];
    organizationId?: string | string[];
  }>;
};

function getRequestedAction(value?: string | string[]) {
  const action = Array.isArray(value) ? value[0] : value;
  const normalizedAction = action?.trim();

  return normalizedAction || undefined;
}

function withOptionalAction(href: string, action?: string) {
  if (!action) {
    return href;
  }

  const url = new URL(href, "https://gameday.local");
  url.searchParams.set("action", action);

  return `${url.pathname}${url.search}${url.hash}`;
}

export default async function EventsHome({
  adminRouteBase = false,
  searchParams,
}: EventsHomeProps) {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const role = await resolveSessionAccessRole(session);

  if (role === "authenticated") {
    redirect("/login");
  }
  const resolvedSearchParams = await searchParams;
  const requestedOrganizationId = getRequestedOrganizationId(
    resolvedSearchParams?.organizationId,
  );
  const requestedAction = getRequestedAction(resolvedSearchParams?.action);
  const activeContext =
    role === "admin"
      ? await resolveActiveAdminOrganizationContext(
          session,
          requestedOrganizationId,
        )
      : undefined;
  const activeOrganizationId = activeContext?.activeOrganizationId;
  if (role === "admin" && activeContext && !adminRouteBase) {
    redirect(
      withOptionalAction(
        withActiveOrganization("/admin/schedule", activeOrganizationId),
        requestedAction,
      ),
    );
  }

  if (role === "admin" && activeContext?.requiresSelection) {
    redirect("/admin");
  }

  const schedule = await getEventScheduleReadModel(role, activeOrganizationId);
  const organizationContext = activeContext?.activeOrganization
    ? { count: 1, label: activeContext.activeOrganization.name }
    : await getOrganizationContext(schedule.organizationIds);
  const repositories = schedule.source === "firestore"
    ? createFirestoreRepositories()
    : null;
  const visibleEvents =
    role === "admin"
      ? schedule.events.filter((event) => !isArchivedEvent(event))
      : schedule.events;
  const upcomingEvents = visibleEvents.filter((event) => isUpcomingEvent(event));
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
  const scheduleIndexHref = adminRouteBase ? "/admin/schedule" : "/events";
  const eventDetailsBaseHref = adminRouteBase ? "/admin/schedule" : "/events";

  const eventContent = (
    <>
        <div className="mt-5 flex justify-end">
          <a
            href={withActiveOrganization("/calendar.ics", activeOrganizationId)}
            className="rounded-md border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200"
          >
            Subscribe Calendar
          </a>
        </div>
        {role === "admin" && activeOrganizationId && (
          <>
            <AdminEventForm
              activeOrganizationId={activeOrganizationId}
              canCreateEvents={schedule.canCreateEvents}
              defaultOpen={
                requestedAction === "create-event" || upcomingEvents.length === 0
              }
              teams={schedule.teams}
            />
          </>
        )}

        <section className="mt-6">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <p className="mt-2 text-sm text-slate-300">
            Published, draft, or canceled events still ahead on the schedule.
          </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {upcomingEvents.length === 0 && (
            <p className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300 lg:col-span-2">
              {activeContext?.requiresSelection
                ? "Choose an organization to view its schedule."
                : "No events are scheduled for your current organization and team scope."}
            </p>
          )}
          {upcomingEvents.map((event) => {
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
            const showsLifecycleStatus = event.status !== "published";

            return (
              <Link
                key={event.id}
                href={withActiveOrganization(
                  `${eventDetailsBaseHref}/${event.id}`,
                  activeOrganizationId,
                )}
                className="block rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-lg"
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
                      event.status === "canceled"
                        ? "bg-red-500/20 text-red-300"
                        : event.status === "draft"
                          ? "bg-yellow-500/20 text-yellow-200"
                          : hasTransportationIssue
                            ? "bg-red-500/20 text-red-300"
                            : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {showsLifecycleStatus
                      ? getEventStatusLabel(event)
                      : hasTransportationIssue
                        ? "Ride Help"
                        : "On Track"}
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
        {role === "admin" && activeOrganizationId && schedule.canCreateEvents && (
          <AdminEventLifecycleManager
            activeOrganizationId={activeOrganizationId}
            events={schedule.events}
            teams={schedule.teams}
          />
        )}
    </>
  );

  if (role === "admin" && activeContext) {
    return (
      <AdminAppShell
        accountLabel={session.user.email}
        activeOrganizationId={activeOrganizationId}
        activeOrganizationName={activeContext.activeOrganization?.name}
        currentSection="schedule"
        description="Create, publish, and monitor practices, games, tournaments, and meetings."
        organizationSelectorAction={scheduleIndexHref}
        organizations={activeContext.organizations}
        title="Schedule"
      >
        {eventContent}
      </AdminAppShell>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="mt-3 text-sm text-slate-300">
            Upcoming practices, tournaments, and meetings.
          </p>
        </div>
        {eventContent}
      </section>
    </main>
  );
}
