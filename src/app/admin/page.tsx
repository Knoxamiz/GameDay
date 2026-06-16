import Link from "next/link";
import { redirect } from "next/navigation";
import AdminAppShell from "../components/AdminAppShell";
import AdminJoinLinkButton from "../components/AdminJoinLinkButton";
import AdminReadinessBoard from "../components/AdminReadinessBoard";
import AdminWorkspaceEntry from "../components/AdminWorkspaceEntry";
import { buildAdminOperatingModel } from "../data/adminOperatingModel";
import { getAdminHomeReadModel } from "../data/adminHomeRead.server";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../data/activeOrganization";
import {
  canAccessAdmin,
  canUseAdminSetup,
  resolveActiveAdminOrganizationContext,
} from "../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../data/currentUser.server";
import { getLandingRouteForSession } from "../data/sessionAccess.server";
import {
  getEventDateLabel,
  getEventTeamIds,
  getEventTimeLabel,
  isArchivedEvent,
  isUpcomingEvent,
} from "../data/events";
import { isActiveTeam } from "../data/teams";

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
    return (
      <AdminWorkspaceEntry
        accountLabel={session.user.email}
        blockedReturnHref={await getLandingRouteForSession(
          session,
          session.claims.role,
        )}
        canCreateWorkspace={false}
        organizations={[]}
      />
    );
  }

  if (activeContext.organizations.length === 1) {
    const onlyOrganizationId = activeContext.organizations[0].id;

    if (requestedOrganizationId !== onlyOrganizationId) {
      redirect(withActiveOrganization("/admin", onlyOrganizationId));
    }
  }

  if (!activeContext.activeOrganizationId) {
    return (
      <AdminWorkspaceEntry
        accountLabel={session.user.email}
        canCreateWorkspace={
          activeContext.organizations.length === 0 &&
          canUseAdminSetup(activeContext.scope)
        }
        organizations={activeContext.organizations}
      />
    );
  }

  const {
    attendanceEntries,
    coachAssignments,
    coaches: organizationCoaches,
    communications: adminCommunications,
    events: adminEvents,
    organization,
    organizationExists,
    registrationInvites,
    registrations: organizationRegistrations,
    teams: organizationTeams,
    transportationEntries,
  } = await getAdminHomeReadModel(activeContext.activeOrganizationId);
  const operatingModel = buildAdminOperatingModel({
    coachAssignments,
    events: adminEvents,
    registrationInvites,
    registrations: organizationRegistrations,
    teams: organizationTeams,
  });
  const adminUpcomingEvents = adminEvents
    .filter((event) => !isArchivedEvent(event))
    .filter((event) => isUpcomingEvent(event));
  const organizationStatus = [
    {
      label: "Rostered Athletes",
      value: operatingModel.rosteredRegistrations.length,
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
  const nextActionHref = withActiveOrganization(
    operatingModel.nextAction.href,
    activeContext.activeOrganizationId,
  );
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
        {!hasAdminOrganizations && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300">
            Create an organization in setup to start managing teams, coaches,
            invites, and events.
          </div>
        )}

        {hasActiveOrganization && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Next Best Action
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {operatingModel.nextAction.label}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {operatingModel.nextAction.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {operatingModel.nextAction.joinPath ? (
                  <>
                    <AdminJoinLinkButton
                      className="rounded-md bg-blue-500 px-4 py-3 text-sm font-semibold text-white"
                      joinPath={operatingModel.nextAction.joinPath}
                      label={operatingModel.nextAction.label}
                    />
                    <Link
                      className="rounded-md border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200"
                      href={nextActionHref}
                    >
                      View invite controls
                    </Link>
                  </>
                ) : (
                  <Link
                    className="rounded-md bg-blue-500 px-4 py-3 text-sm font-semibold text-white"
                    href={nextActionHref}
                  >
                    {operatingModel.nextAction.label}
                  </Link>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Workspace Stage
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {operatingModel.stageLabel}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {operatingModel.stageDescription}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Managing
              </p>
              <p className="mt-1 font-semibold text-white">
                {organizationExists ? organization.name : "Organization record unavailable"}
              </p>
            </section>
          </div>
        )}

        {hasActiveOrganization && (
          <section className="mt-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Organization Health
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {organizationStatus.map((status) => (
                <div key={status.label} className="rounded-md bg-slate-950 p-3">
                  <p className="text-2xl font-bold">{status.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{status.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasActiveOrganization && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Registration Pipeline</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Invite access, submitted registrations, review, and roster
                    placement.
                  </p>
                </div>
                <Link
                  className="shrink-0 rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
                  href={withActiveOrganization(
                    "/admin/registrations",
                    activeContext.activeOrganizationId,
                  )}
                >
                  Review
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-800 p-3">
                  <p className="text-slate-400">Open Invites</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {operatingModel.openInvites.length}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800 p-3">
                  <p className="text-slate-400">Registrations</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {organizationRegistrations.length}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800 p-3">
                  <p className="text-slate-400">Pending Review</p>
                  <p className="mt-1 text-xl font-bold text-yellow-200">
                    {operatingModel.pendingRegistrations.length}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-800 p-3">
                  <p className="text-slate-400">Ready To Roster</p>
                  <p className="mt-1 text-xl font-bold text-blue-300">
                    {operatingModel.approvedNotRosteredRegistrations.length}
                  </p>
                </div>
              </div>
              {operatingModel.openInvites.length === 0 && (
                <Link
                  className="mt-4 block rounded-xl bg-blue-500 py-3 text-center text-sm font-semibold text-white"
                  href={withActiveOrganization(
                    "/admin/setup#registration-invites",
                    activeContext.activeOrganizationId,
                  )}
                >
                  Open registration
                </Link>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Team Operations</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Team coverage, rostered athletes, and schedule readiness.
                  </p>
                </div>
                <Link
                  className="shrink-0 rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200"
                  href={withActiveOrganization(
                    "/admin/teams",
                    activeContext.activeOrganizationId,
                  )}
                >
                  Teams
                </Link>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {operatingModel.teamsNeedingCoaches.length > 0 ? (
                  <Link
                    className="block rounded-xl bg-slate-800 p-4 font-semibold text-white"
                    href={withActiveOrganization(
                      "/admin/setup#coach-assignments",
                      activeContext.activeOrganizationId,
                    )}
                  >
                    {operatingModel.teamsNeedingCoaches.length} team
                    {operatingModel.teamsNeedingCoaches.length === 1 ? "" : "s"}{" "}
                    need coach coverage
                  </Link>
                ) : (
                  <p className="rounded-xl bg-slate-800 p-4">
                    Coach coverage is set for active teams.
                  </p>
                )}
                {operatingModel.rosteredTeamsWithoutEvents.length > 0 ? (
                  <Link
                    className="block rounded-xl bg-slate-800 p-4 font-semibold text-white"
                    href={withActiveOrganization(
                      "/admin/schedule?action=create-event#create-event",
                      activeContext.activeOrganizationId,
                    )}
                  >
                    {operatingModel.rosteredTeamsWithoutEvents.length} rostered
                    team
                    {operatingModel.rosteredTeamsWithoutEvents.length === 1
                      ? ""
                      : "s"}{" "}
                    need a published event
                  </Link>
                ) : (
                  <p className="rounded-xl bg-slate-800 p-4">
                    No rostered team is missing a published event.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Schedule</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Upcoming published, draft, or canceled events for this
                  organization.
                </p>
              </div>
              <Link
                href={withActiveOrganization(
                  "/admin/schedule?action=create-event#create-event",
                  activeContext.activeOrganizationId,
                )}
                className="shrink-0 rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white"
              >
                Create event
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {adminUpcomingEvents.length === 0 && (
                <p className="rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                  No upcoming events have been created for this organization.
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
                      `/admin/schedule/${event.id}`,
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
                "/admin/schedule",
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
              {adminCommunications.length > 0 ? (
                adminCommunications.map((item) => (
                  <p key={item.id}>{item.content}</p>
                ))
              ) : (
                <p>
                  Organization announcements are not active yet. Use the real
                  setup, registration, roster, and schedule tools for this slice.
                </p>
              )}
            </div>
          </div>
        )}

    </AdminAppShell>
  );
}
