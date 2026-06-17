import { redirect } from "next/navigation";
import AdminOrganizationWorkspaceHome from "../../components/AdminOrganizationWorkspaceHome";
import { getAdminHomeReadModel } from "../../data/adminHomeRead.server";
import { buildAdminOperatingModel } from "../../data/adminOperatingModel";
import { getRequestedOrganizationId } from "../../data/activeOrganization";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { getOrganizationWorkspaceType } from "../../data/organizations";
import { getLandingRouteForSession } from "../../data/sessionAccess.server";

export const dynamic = "force-dynamic";

type AdminTeamsPageProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export default async function AdminTeamsPage({
  searchParams,
}: AdminTeamsPageProps) {
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

  if (!requestedOrganizationId || !activeContext.activeOrganizationId) {
    redirect("/admin");
  }

  const readModel = await getAdminHomeReadModel(
    activeContext.activeOrganizationId,
  );
  const operatingModel = buildAdminOperatingModel({
    coachAssignments: readModel.coachAssignments,
    events: readModel.events,
    registrationInvites: readModel.registrationInvites,
    registrations: readModel.registrations,
    teams: readModel.teams,
    workspaceType: getOrganizationWorkspaceType(readModel.organization),
  });

  return (
    <AdminOrganizationWorkspaceHome
      accountLabel={session.user.email}
      activeOrganizationId={activeContext.activeOrganizationId}
      currentSection="teams"
      operatingModel={operatingModel}
      organizations={activeContext.organizations}
      readModel={readModel}
    />
  );
}
