import BottomNav from "../../components/BottomNav";
import { redirect } from "next/navigation";
import AdminOrganizationSelector from "../../components/AdminOrganizationSelector";
import AdminSetupPanel from "../../components/AdminSetupPanel";
import MvpNav from "../../components/MvpNav";
import SessionControls from "../../components/SessionControls";
import { getAdminSetupReadModel } from "../../data/adminSetup.server";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../../data/activeOrganization";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { getLandingRouteForSession } from "../../data/sessionAccess.server";

export const dynamic = "force-dynamic";

type AdminSetupPageProps = {
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

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
    redirect(await getLandingRouteForSession(session));
  }
  const setup = await getAdminSetupReadModel(
    activeContext.activeOrganizationId,
  );
  const organizationContext = activeContext.activeOrganization
      ? {
          count: 1,
          label: activeContext.activeOrganization.name,
        }
      : undefined;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav
          activeOrganizationId={activeContext.activeOrganizationId}
          organizationContext={organizationContext}
        />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Setup</h1>
          <p className="mt-3 text-sm text-slate-300">
            Create the real organization, team, coach, and registration records.
          </p>
        </div>

        <SessionControls role="admin" />

        <AdminOrganizationSelector
          action="/admin/setup"
          activeOrganizationId={activeContext.activeOrganizationId}
          organizations={activeContext.organizations}
        />

        {!activeContext.requiresSelection && (
          <AdminSetupPanel
            activeOrganizationId={activeContext.activeOrganizationId}
            canCreateOrganization={setup.canCreateOrganization}
            canManageSetup={setup.canManageSetup}
            coachAssignments={setup.coachAssignments}
            coaches={setup.coaches}
            organizationManagementAuthority={
              setup.organizationManagementAuthority
            }
            organizationMemberships={setup.organizationMemberships}
            organizations={setup.organizations}
            registrationInvites={setup.registrationInvites}
            teams={setup.teams}
          />
        )}

        <BottomNav
          items={[
            {
              href: withActiveOrganization(
                "/admin",
                activeContext.activeOrganizationId,
              ),
              label: "Home",
            },
            {
              href: withActiveOrganization(
                "/admin/setup",
                activeContext.activeOrganizationId,
              ),
              label: "Setup",
            },
            {
              href: withActiveOrganization(
                "/admin/registrations",
                activeContext.activeOrganizationId,
              ),
              label: "Registration",
            },
            {
              href: withActiveOrganization(
                "/events",
                activeContext.activeOrganizationId,
              ),
              label: "Schedule",
            },
          ]}
        />
      </section>
    </main>
  );
}
