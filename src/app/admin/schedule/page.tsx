import { redirect } from "next/navigation";
import AdminOrganizationWorkspaceHome from "../../components/AdminOrganizationWorkspaceHome";
import { getRequestedOrganizationId } from "../../data/activeOrganization";
import { getAdminHomeReadModel } from "../../data/adminHomeRead.server";
import { buildAdminOperatingModel } from "../../data/adminOperatingModel";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { getOrganizationWorkspaceType } from "../../data/organizations";
import { getLandingRouteForSession } from "../../data/sessionAccess.server";

type AdminSchedulePageProps = {
  searchParams?: Promise<{
    action?: string | string[];
    organizationId?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage(props: AdminSchedulePageProps) {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await props.searchParams;
  const requestedOrganizationId = getRequestedOrganizationId(
    resolvedSearchParams?.organizationId,
  );
  const requestedAction = Array.isArray(resolvedSearchParams?.action)
    ? resolvedSearchParams?.action[0]
    : resolvedSearchParams?.action;
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
      currentSection="schedule"
      operatingModel={operatingModel}
      organizations={activeContext.organizations}
      readModel={readModel}
      scheduleDefaultCreateOpen={requestedAction === "create-event"}
    />
  );
}
