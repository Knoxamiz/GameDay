import Link from "next/link";
import { redirect } from "next/navigation";
import AdminAppShell from "../components/AdminAppShell";
import AdminJoinLinkButton from "../components/AdminJoinLinkButton";
import MvpNav from "../components/MvpNav";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../data/activeOrganization";
import { resolveActiveAdminOrganizationContext } from "../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../data/currentUser.server";
import {
  eventHasTeamId,
  getEventShortDateLabel,
  getEventTimeLabel,
  isPublishedEvent,
  isUpcomingEvent,
  sortEventsByStartDate,
} from "../data/events";
import { getEventScheduleReadModel } from "../data/eventSchedule.server";
import {
  getRegistrationInviteAvailability,
  getRegistrationInviteStatus,
} from "../data/invites";
import { getOrganizationContext } from "../data/organizationContext.server";
import { getOrganizationWorkspaceType } from "../data/organizations";
import { isCoachVisibleRosterRegistration } from "../data/registrations";
import { resolveSessionAccessRole } from "../data/sessionAccess.server";
import { summarizeTransportationEntries } from "../data/transportation";
import { getTeamStatusLabel, isArchivedTeam } from "../data/teams";
import { isActiveCoachAssignment } from "../data/coachAssignmentRecords";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

export const dynamic = "force-dynamic";

function isDefined<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return Boolean(value);
}

function getInviteRegistrationCount(
  inviteId: string,
  inviteCode: string,
  registrations: Array<{
    id: string;
    inviteCode?: string;
    registrationInviteId?: string;
  }>,
) {
  return new Set(
    registrations
      .filter(
        (registration) =>
          registration.registrationInviteId === inviteId ||
          registration.inviteCode === inviteCode,
      )
      .map((registration) => registration.id),
  ).size;
}

type TeamsHomeProps = {
  adminRouteBase?: boolean;
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export default async function TeamsHome({
  adminRouteBase = false,
  searchParams,
}: TeamsHomeProps) {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const role = await resolveSessionAccessRole(session);

  if (role === "authenticated") {
    redirect("/account");
  }
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
  if (role === "admin" && activeContext && !adminRouteBase) {
    redirect(withActiveOrganization("/admin/teams", activeOrganizationId));
  }

  if (role === "admin" && activeContext?.requiresSelection) {
    redirect("/admin");
  }

  const schedule = await getEventScheduleReadModel(role, activeOrganizationId);
  const organizationContext = activeContext?.activeOrganization
    ? { count: 1, label: activeContext.activeOrganization.name }
    : await getOrganizationContext(schedule.organizationIds);
  const isSingleTeamWorkspace =
    getOrganizationWorkspaceType(activeContext?.activeOrganization) ===
    "single_team";
  const repositories = schedule.source === "firestore"
    ? createFirestoreRepositories()
    : null;
  const visibleTeams =
    role === "admin"
      ? schedule.teams.filter((team) => !isArchivedTeam(team))
      : schedule.teams;
  const nextEventByTeamId = new Map(
    visibleTeams.map((team) => [
      team.id,
      schedule.events
        .filter(isPublishedEvent)
        .filter((event) => isUpcomingEvent(event))
        .filter((event) => eventHasTeamId(event, team.id))
        .sort(sortEventsByStartDate)[0],
    ]),
  );
  const nextEvents = [...new Map(
    [...nextEventByTeamId.values()]
      .filter(isDefined)
      .map((event) => [event.id, event]),
  ).values()];
  const [
    transportationLists,
    registrationLists,
    registrationInvites,
    coachAssignments,
  ] = repositories
    ? await Promise.all([
        Promise.all(
          nextEvents.map((event) =>
            repositories.transportation.listByEventId(event.id),
          ),
        ),
        Promise.all(
          visibleTeams.map((team) =>
            repositories.registrations.listByTeamId(team.id),
          ),
        ),
        role === "admin" && activeOrganizationId
          ? repositories.registrationInvites.listByOrganizationId(
              activeOrganizationId,
            )
          : Promise.resolve([]),
        role === "admin" && activeOrganizationId
          ? repositories.coachAssignments.listByOrganizationId(
              activeOrganizationId,
            )
          : Promise.resolve([]),
      ])
    : [[], [], [], []];
  const transportationByEventId = new Map(
    nextEvents.map((event, index) => [
      event.id,
      transportationLists[index] ?? [],
    ]),
  );
  const rosteredCountByTeamId = new Map(
    visibleTeams.map((team, index) => [
      team.id,
      (registrationLists[index] ?? []).filter(isCoachVisibleRosterRegistration)
        .length,
    ]),
  );
  const teamsIndexHref = adminRouteBase ? "/admin/teams" : "/teams";
  const scheduleIndexHref = adminRouteBase ? "/admin/schedule" : "/events";
  const teamDetailsBaseHref = adminRouteBase ? "/admin/teams" : "/teams";
  const registrationsByTeamId = new Map(
    visibleTeams.map((team, index) => [team.id, registrationLists[index] ?? []]),
  );
  const coachAssignmentTeamIds = new Set(
    coachAssignments
      .filter(isActiveCoachAssignment)
      .flatMap((assignment) => assignment.teamIds),
  );
  const currentInvitesByTeamId = new Map(
    visibleTeams.map((team) => [
      team.id,
      registrationInvites.filter(
        (invite) =>
          invite.teamId === team.id &&
          getRegistrationInviteStatus(invite) !== "archived",
      ),
    ]),
  );
  const openInviteByTeamId = new Map(
    visibleTeams.map((team) => {
      const teamRegistrations = registrationsByTeamId.get(team.id) ?? [];
      const openInvite = (currentInvitesByTeamId.get(team.id) ?? []).find(
        (invite) =>
          getRegistrationInviteAvailability(invite, {
            registrationCount: getInviteRegistrationCount(
              invite.id,
              invite.inviteCode,
              teamRegistrations,
            ),
            scopeIsValid: true,
          }).available,
      );

      return [team.id, openInvite];
    }),
  );

  const teamList = (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {visibleTeams.length === 0 && (
            <p className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300 lg:col-span-2">
              {activeContext?.requiresSelection
                ? "Choose an organization to view its teams."
                : "No teams are available for your current organization and role scope."}
            </p>
          )}
          {visibleTeams.map((team) => {
            const nextEvent = nextEventByTeamId.get(team.id);
            const transportation = nextEvent
              ? summarizeTransportationEntries(
                  nextEvent.id,
                  transportationByEventId.get(nextEvent.id) ?? [],
                )
              : { needsRide: 0 };
            const needsCoach =
              role === "admin"
                ? !coachAssignmentTeamIds.has(team.id)
                : team.coachIds.length === 0;
            const needsRideHelp = transportation.needsRide > 0;
            const teamInvites = currentInvitesByTeamId.get(team.id) ?? [];
            const openInvite = openInviteByTeamId.get(team.id);
            const rosteredCount = rosteredCountByTeamId.get(team.id) ?? 0;
            const inviteActionLabel =
              teamInvites.length === 0
                ? "Create invite"
                : openInvite
                  ? "Copy join link"
                  : "Open registration";

            return (
              <article
                key={team.id}
                className="rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {team.label} - {getTeamStatusLabel(team)}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{team.name}</h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      needsCoach || needsRideHelp
                        ? "bg-red-500/20 text-red-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {needsCoach
                      ? "Needs Coach"
                      : needsRideHelp
                        ? "Ride Help"
                        : "On Track"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Rostered</p>
                    <p className="mt-1 font-semibold text-white">
                      {rosteredCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-3">
                    <p className="text-slate-400">Coaches</p>
                    <p
                      className={`mt-1 font-semibold ${
                        needsCoach ? "text-red-300" : "text-blue-300"
                      }`}
                    >
                      {team.coachIds.length}
                    </p>
                  </div>
                </div>

                {nextEvent ? (
                  <div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                    <p className="font-semibold text-white">Next Event</p>
                    <p className="mt-2">
                      {getEventShortDateLabel(nextEvent)} {nextEvent.type}
                    </p>
                    <p className="mt-1">{getEventTimeLabel(nextEvent)}</p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-800 p-4 text-sm text-slate-300">
                    No upcoming event.
                  </p>
                )}
                {role === "admin" ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                    {needsCoach && (
                      <Link
                        className="rounded-md bg-blue-500 px-3 py-2 text-white"
                        href={withActiveOrganization(
                          "/admin/setup#coach-assignments",
                          activeOrganizationId,
                        )}
                      >
                        Assign coach
                      </Link>
                    )}
                    {openInvite ? (
                      <AdminJoinLinkButton
                        className="rounded-md border border-slate-700 px-3 py-2 text-slate-200"
                        joinPath={`/join/${openInvite.inviteCode}`}
                        label={inviteActionLabel}
                      />
                    ) : (
                      <Link
                        className="rounded-md border border-slate-700 px-3 py-2 text-slate-200"
                        href={withActiveOrganization(
                          "/admin/registrations",
                          activeOrganizationId,
                        )}
                      >
                        {inviteActionLabel}
                      </Link>
                    )}
                    <Link
                      className="rounded-md border border-slate-700 px-3 py-2 text-slate-200"
                      href={withActiveOrganization(
                        "/admin/registrations#roster",
                        activeOrganizationId,
                      )}
                    >
                      View roster
                    </Link>
                    {!nextEvent && rosteredCount > 0 && (
                      <Link
                        className="rounded-md border border-slate-700 px-3 py-2 text-slate-200"
                        href={withActiveOrganization(
                          `${scheduleIndexHref}?action=create-event#create-event`,
                          activeOrganizationId,
                        )}
                      >
                        Create event
                      </Link>
                    )}
                    <Link
                      className="rounded-md border border-slate-700 px-3 py-2 text-slate-200"
                      href={withActiveOrganization(
                        `${teamDetailsBaseHref}/${team.id}`,
                        activeOrganizationId,
                      )}
                    >
                      View team
                    </Link>
                  </div>
                ) : (
                  <Link
                    className="mt-4 block rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
                    href={withActiveOrganization(
                      `${teamDetailsBaseHref}/${team.id}`,
                      activeOrganizationId,
                    )}
                  >
                    View team
                  </Link>
                )}
              </article>
            );
          })}
    </div>
  );

  if (role === "admin" && activeContext) {
    return (
      <AdminAppShell
        accountLabel={session.user.email}
        activeOrganizationId={activeOrganizationId}
        activeOrganizationName={activeContext.activeOrganization?.name}
        currentSection="teams"
        description={
          isSingleTeamWorkspace
            ? "Manage the one team in this Team Builder workspace."
            : "Roster, schedule, and readiness by team."
        }
        organizationSelectorAction={teamsIndexHref}
        organizations={activeContext.organizations}
        title={isSingleTeamWorkspace ? "Team" : "Teams"}
      >
        {teamList}
      </AdminAppShell>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav organizationContext={organizationContext} />
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="mt-3 text-sm text-slate-300">
            Roster, schedule, and readiness by team.
          </p>
        </div>
        {teamList}
      </section>
    </main>
  );
}
