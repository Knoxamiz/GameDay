import { redirect } from "next/navigation";
import AdminAppShell from "../../components/AdminAppShell";
import AdminSetupChecklist from "../../components/AdminSetupChecklist";
import AdminSetupPanel, {
  type SetupSectionId,
} from "../../components/AdminSetupPanel";
import { getAdminSetupReadModel } from "../../data/adminSetup.server";
import { buildAdminSetupChecklist } from "../../data/adminSetupChecklist";
import {
  getRequestedOrganizationId,
} from "../../data/activeOrganization";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { getOrganizationWorkspaceType } from "../../data/organizations";
import { getLandingRouteForSession } from "../../data/sessionAccess.server";

export const dynamic = "force-dynamic";

type AdminSetupPageProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

function getDefaultSetupSection(
  stepId?: string,
): SetupSectionId | undefined {
  if (stepId === "organization") {
    return "organization";
  }

  if (stepId === "team") {
    return "teams";
  }

  if (stepId === "invite" || stepId === "registration-open") {
    return "invites";
  }

  return undefined;
}

export default async function AdminSetupPage({
  searchParams,
}: AdminSetupPageProps) {
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

  if (!activeContext.activeOrganizationId) {
    redirect("/admin");
  }

  const setup = await getAdminSetupReadModel(
    activeContext.activeOrganizationId,
  );
  const setupChecklist = buildAdminSetupChecklist({
    activeOrganization: setup.organizations[0],
    coachAssignments: setup.coachAssignments,
    events: setup.events,
    registrationInvites: setup.registrationInvites,
    registrations: setup.registrations,
    teams: setup.teams,
  });
  const defaultOpenSection = getDefaultSetupSection(
    setupChecklist.nextRequiredStep?.id,
  );
  const isSingleTeamWorkspace =
    getOrganizationWorkspaceType(setup.organizations[0]) === "single_team";

  return (
    <AdminAppShell
      accountLabel={session.user.email}
      activeOrganizationId={activeContext.activeOrganizationId}
      activeOrganizationName={activeContext.activeOrganization?.name}
      currentSection="setup"
      description={
        isSingleTeamWorkspace
          ? "Open the team registration link, manage the team record, and keep setup focused on one team."
          : "See what is complete, take the next required action, and open management tools only when needed."
      }
      organizationSelectorAction="/admin/setup"
      organizations={activeContext.organizations}
      title={isSingleTeamWorkspace ? "Team Builder Setup" : "Setup"}
    >
      {!activeContext.requiresSelection && (
        <AdminSetupChecklist checklist={setupChecklist} />
      )}

      {!activeContext.requiresSelection && (
        <AdminSetupPanel
          activeOrganizationId={activeContext.activeOrganizationId}
          canCreateOrganization={setup.canCreateOrganization}
          canManageSetup={setup.canManageSetup}
          coachAssignments={setup.coachAssignments}
          coaches={setup.coaches}
          defaultOpenSection={defaultOpenSection}
          organizationMemberships={setup.organizationMemberships}
          organizations={setup.organizations}
          registrationInvites={setup.registrationInvites}
          teams={setup.teams}
        />
      )}
    </AdminAppShell>
  );
}
