import Link from "next/link";
import { redirect } from "next/navigation";
import AdminAppShell from "../components/AdminAppShell";
import AdminReadinessBoard from "../components/AdminReadinessBoard";
import AdminSetupChecklist from "../components/AdminSetupChecklist";
import AttendanceConcernAction from "../components/AttendanceConcernAction";
import RegistrationAdminActionLinks from "../components/RegistrationAdminActionLinks";
import TransportationIssueAction from "../components/TransportationIssueAction";
import { getAdminHomeReadModel } from "../data/adminHomeRead.server";
import { buildAdminSetupChecklist } from "../data/adminSetupChecklist";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../data/activeOrganization";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../data/currentUser.server";
import { getLandingRouteForSession } from "../data/sessionAccess.server";
import {
  getEventDateLabel,
  getEventTeamIds,
  getEventTimeLabel,
} from "../data/events";
import { isCoachVisibleRosterRegistration } from "../data/registrations";
import { getTeamsNeedingCoaches, isActiveTeam } from "../data/teams";

export const dynamic = "force-dynamic";

type AdminHomeProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export default async function AdminHome({ searchParams }: AdminHomeProps) {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const requestedOrganizationId = getRequestedOrganizationId(
    (await searchParams)?.organizationId,
  );
  const activeContext = await resolveActiveAdminOrganizationContext(
    session,
    requestedOrganizationId,
  );

  if (!canAccessAdmin(activeContext.scope)) {
    redirect(await getLandingRouteForSession(session));
  }
  const {
    attendanceEntries,
    coachAssignments,
    coaches: organizationCoaches,
    communications: adminCommunications,
    events: adminUpcomingEvents,
    organization,
    organizationExists,
    registrationInvites,
    registrations: organizationRegistrations,
    teams: organizationTeams,
    transportationEntries,
  } = await getAdminHomeReadModel(activeContext.activeOrganizationId);
  const setupChecklist = buildAdminSetupChecklist({
    activeOrganization: organizationExists ? organization : undefined,
    coachAssignments,
    events: adminUpcomingEvents,
    registrationInvites,
    registrations: organizationRegistrations,
    teams: organizationTeams,
  });
  const adminUpcomingEventIdSet = new Set(
    adminUpcomingEvents.map((event) => event.id),
  );
  const adminAttendanceEntries = attendanceEntries.filter((entry) =>
    adminUpcomingEventIdSet.has(entry.eventId),
  );
  const teamsNeedingCoaches = getTeamsNeedingCoaches(organizationTeams);
  const organizationStatus = [
    {
      label: "Rostered Athletes",
      value: organizationRegistrations.filter(isCoachVisibleRosterRegistration)
        .length,
    },
    {
      label: "Active Teams",
      value: organizationTeams.filter(isActiveTeam).length,
    },
    {
      label: "Coaches",
      value: organizationCoaches.length,
    },
    {
      label: "Upcoming Events",
      value: adminUpcomingEvents.length,
    },
  ];
  const teamById = new Map(organizationTeams.map((team) => [team.id, team]));
  const hasAdminOrganizations = activeContext.organizations.length > 0;
  const hasActiveOrganization = Boolean(activeContext.activeOrganizationId);
  return (
    <AdminAppShell
      accountLabel={session.user.email}
      activeOrganizationId={activeContext.activeOrganizationId}
      activeOrganizationName={activeContext.activeOrganization?.name}
      currentSection="home"
      description="Your organization setup, operational alerts, registration work, and upcoming schedule."
      organizationSelectorAction="/admin"
      organizations={activeContext.organizations}
      title="Admin Home"
    >
        {!activeContext.requiresSelection && (
          <AdminSetupChecklist checklist={setupChecklist} />
        )}

        {!hasAdminOrganizations && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
            Create an organization in setup to start managing teams, coaches,
            invites, and events.
          </div>
        )}

        {hasActiveOrganization && (
          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Organization Status
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {organizationStatus.map((status) => (
                <div key={status.label} className="rounded-md bg-slate-950 p-3">
                  <p className="text-2xl font-bold">{status.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{status.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Action Items</h2>
          <div className="mt-3 space-y-3 text-sm">
            {hasActiveOrganization && (
              <RegistrationAdminActionLinks
                href={withActiveOrganization(
                  "/admin/registrations",
                  activeContext.activeOrganizationId,
                )}
                registrations={organizationRegistrations}
              />
            )}
            <Link
              href={withActiveOrganization(
                "/admin/setup",
                activeContext.activeOrganizationId,
              )}
              className="block rounded-xl bg-slate-800 p-4 font-semibold text-white"
            >
              Setup Organization, Teams, Coaches, And Invites
            </Link>
            {hasActiveOrganization && (
              <>
                <Link
                  href={withActiveOrganization(
                    "/events",
                    activeContext.activeOrganizationId,
                  )}
                  className="block rounded-xl bg-slate-800 p-4 font-semibold text-white"
                >
                  Create Schedule Event
                </Link>
                {teamsNeedingCoaches.map((team) => (
                  <Link
                    key={team.id}
                    href={withActiveOrganization(
                      `/teams/${team.id}`,
                      activeContext.activeOrganizationId,
                    )}
                    className="block rounded-xl bg-slate-800 p-4 font-semibold text-white"
                  >
                    {team.name} Needs Coach
                  </Link>
                ))}
                <AttendanceConcernAction
                  entries={adminAttendanceEntries}
                  href={withActiveOrganization(
                    "/events",
                    activeContext.activeOrganizationId,
                  )}
                />
                <TransportationIssueAction
                  entries={transportationEntries}
                  href={withActiveOrganization(
                    "/events",
                    activeContext.activeOrganizationId,
                  )}
                />
              </>
            )}
          </div>
        </div>

        {hasActiveOrganization && (
          <AdminReadinessBoard
            attendanceEntries={attendanceEntries}
            events={adminUpcomingEvents}
            registrations={organizationRegistrations}
            teams={organizationTeams}
            transportationEntries={transportationEntries}
          />
        )}

        {hasActiveOrganization && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold">Upcoming Events</h2>
            <div className="mt-3 space-y-3">
              {adminUpcomingEvents.length === 0 && (
                <p className="rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                  No real events have been created yet.
                </p>
              )}
              {adminUpcomingEvents.map((event) => {
                const eventTeams = getEventTeamIds(event)
                  .map((teamId) => teamById.get(teamId))
                  .filter(Boolean);

                return (
                  <Link
                    key={event.id}
                    href={withActiveOrganization(
                      `/events/${event.id}`,
                      activeContext.activeOrganizationId,
                    )}
                    className="block rounded-xl bg-slate-800 p-4"
                  >
                    <p className="font-semibold">{event.title}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {getEventDateLabel(event)} {getEventTimeLabel(event)}
                    </p>
                    {eventTeams.length > 0 && (
                      <p className="mt-1 text-sm text-slate-300">
                        {eventTeams.map((team) => team?.label).join(", ")}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
            <Link
              href={withActiveOrganization(
                "/events",
                activeContext.activeOrganizationId,
              )}
              className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            >
              View Schedule
            </Link>
          </div>
        )}

        {hasActiveOrganization && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold">Communications</h2>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              {adminCommunications.map((item) => (
                <p key={item.id}>{item.content}</p>
              ))}
            </div>
          </div>
        )}

    </AdminAppShell>
  );
}
