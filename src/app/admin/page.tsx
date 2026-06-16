import { redirect } from "next/navigation";
import AdminContextHome, {
  type AdminTeamChoice,
} from "../components/AdminContextHome";
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
import { getOrganizationWorkspaceType } from "../data/organizations";
import { isActiveTeam } from "../data/teams";
import { getLandingRouteForSession } from "../data/sessionAccess.server";

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
    redirect(await getLandingRouteForSession(session, session.claims.role));
  }

  if (activeContext.organizations.length === 1) {
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
