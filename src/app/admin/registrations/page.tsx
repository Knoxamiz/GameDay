import { redirect } from "next/navigation";
import AdminAppShell from "../../components/AdminAppShell";
import RegistrationReviewBoard from "../../components/RegistrationReviewBoard";
import { getAdminRegistrationReadModel } from "../../data/adminRegistrationRead.server";
import {
  getRequestedOrganizationId,
} from "../../data/activeOrganization";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { getLandingRouteForSession } from "../../data/sessionAccess.server";

export const dynamic = "force-dynamic";

type AdminRegistrationsPageProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export default async function AdminRegistrationsPage({
  searchParams,
}: AdminRegistrationsPageProps) {
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
  const registrationReadModel = await getAdminRegistrationReadModel(
    activeContext.activeOrganizationId,
  );
  return (
    <AdminAppShell
      accountLabel={session.user.email}
      activeOrganizationId={activeContext.activeOrganizationId}
      activeOrganizationName={activeContext.activeOrganization?.name}
      currentSection="registration"
      description="Review submitted registrations, resolve missing items, approve players, and manage roster status."
      organizationSelectorAction="/admin/registrations"
      organizations={activeContext.organizations}
      title="Registration Review"
    >
      {activeContext.activeOrganizationId && (
        <RegistrationReviewBoard
          activeOrganizationId={activeContext.activeOrganizationId}
          registrations={registrationReadModel.registrations}
          source={registrationReadModel.source}
        />
      )}
    </AdminAppShell>
  );
}
