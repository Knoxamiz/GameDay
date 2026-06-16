import { redirect } from "next/navigation";
import AdminContextHome, {
  type AdminTeamChoice,
} from "../components/AdminContextHome";
import AdminOrganizationWorkspaceHome from "../components/AdminOrganizationWorkspaceHome";
import { getAdminHomeReadModel } from "../data/adminHomeRead.server";
import { buildAdminOperatingModel } from "../data/adminOperatingModel";
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
import { buildAdminSetupChecklist } from "../data/adminSetupChecklist";
import { getOrganizationWorkspaceType } from "../data/organizations";
import { isActiveTeam } from "../data/teams";
import { getLandingRouteForSession } from "../data/sessionAccess.server";

export const dynamic = "force-dynamic";

type AdminHomeProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
    view?: string | string[];
  }>;
};

function getRequestedView(value?: string | string[]) {
  const view = Array.isArray(value) ? value[0] : value;

  return view?.trim();
}

export default async function AdminHome({ searchParams }: AdminHomeProps) {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const requestedOrganizationId = getRequestedOrganizationId(
    resolvedSearchParams?.organizationId,
  );
  const requestedView = getRequestedView(resolvedSearchParams?.view);
  const shouldShowWorkspacePicker = requestedView === "workspaces";
  const activeContext = await resolveActiveAdminOrganizationContext(
    session,
    requestedOrganizationId,
  );

  if (!canAccessAdmin(activeContext.scope)) {
    redirect(await getLandingRouteForSession(session, session.claims.role));
  }

  if (activeContext.organizations.length === 1 && !shouldShowWorkspacePicker) {
    const onlyOrganizationId = activeContext.organizations[0].id;

    if (requestedOrganizationId !== onlyOrganizationId) {
      redirect(withActiveOrganization("/admin", onlyOrganizationId));
    }
  }

  const activeOrganizationId = activeContext.activeOrganizationId;
  const organizationReadModels = await Promise.all(
    activeContext.organizations.map((organization) =>
      getAdminHomeReadModel(organization.id),
    ),
  );
  const teams: AdminTeamChoice[] = organizationReadModels.flatMap(
    (readModel) =>
      readModel.teams
        .filter(isActiveTeam)
        .map((team) => ({
          division: team.division,
          id: team.id,
          label: team.label,
          name: team.name,
          organizationId: team.organizationId,
          organizationName:
            readModel.organization.name ||
            activeContext.organizations.find(
              (organization) => organization.id === team.organizationId,
            )?.name ||
            team.organizationId,
          season: team.season,
        })),
  );
  const organizations = activeContext.organizations.filter(
    (organization) => getOrganizationWorkspaceType(organization) !== "single_team",
  );

  if (activeOrganizationId && !shouldShowWorkspacePicker) {
    const activeReadModel =
      organizationReadModels.find(
        (readModel) => readModel.organization.id === activeOrganizationId,
      ) ?? organizationReadModels[0];
    const setupChecklist = buildAdminSetupChecklist({
      activeOrganization: activeReadModel.organization,
      coachAssignments: activeReadModel.coachAssignments,
      events: activeReadModel.events,
      registrationInvites: activeReadModel.registrationInvites,
      registrations: activeReadModel.registrations,
      teams: activeReadModel.teams,
    });
    const operatingModel = buildAdminOperatingModel({
      coachAssignments: activeReadModel.coachAssignments,
      events: activeReadModel.events,
      registrationInvites: activeReadModel.registrationInvites,
      registrations: activeReadModel.registrations,
      teams: activeReadModel.teams,
      workspaceType: getOrganizationWorkspaceType(activeReadModel.organization),
    });

    return (
      <AdminOrganizationWorkspaceHome
        accountLabel={session.user.email}
        activeOrganizationId={activeOrganizationId}
        operatingModel={operatingModel}
        organizations={activeContext.organizations}
        readModel={activeReadModel}
        setupChecklist={setupChecklist}
      />
    );
  }

  return (
    <AdminContextHome
      accountLabel={session.user.email}
      activeOrganizationId={activeOrganizationId}
      canCreateOrganization={canUseAdminSetup(activeContext.scope)}
      organizations={organizations}
      teams={teams}
    />
  );
}
