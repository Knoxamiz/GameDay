import BottomNav from "../../components/BottomNav";
import { redirect } from "next/navigation";
import AdminOrganizationSelector from "../../components/AdminOrganizationSelector";
import MvpNav from "../../components/MvpNav";
import RegistrationReviewBoard from "../../components/RegistrationReviewBoard";
import { getAdminRegistrationReadModel } from "../../data/adminRegistrationRead.server";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../../data/activeOrganization";
import { resolveActiveAdminOrganizationContext } from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { getLandingRouteForClaims } from "../../infrastructure/auth";

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

  if (session.claims.role !== "admin") {
    redirect(getLandingRouteForClaims(session.claims));
  }

  const requestedOrganizationId = getRequestedOrganizationId(
    (await searchParams)?.organizationId,
  );
  const activeContext = await resolveActiveAdminOrganizationContext(
    session,
    requestedOrganizationId,
  );
  const registrationReadModel = await getAdminRegistrationReadModel(
    activeContext.activeOrganizationId,
  );
  const organizationContext = activeContext.activeOrganization
    ? { count: 1, label: activeContext.activeOrganization.name }
    : undefined;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav
          activeOrganizationId={activeContext.activeOrganizationId}
          organizationContext={organizationContext}
        />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">Registration Review</h1>
          <p className="mt-3 text-sm text-slate-300">
            Pending players, missing items, and approval readiness.
          </p>
        </div>

        <AdminOrganizationSelector
          action="/admin/registrations"
          activeOrganizationId={activeContext.activeOrganizationId}
          organizations={activeContext.organizations}
        />

        {activeContext.activeOrganizationId && (
          <RegistrationReviewBoard
            activeOrganizationId={activeContext.activeOrganizationId}
            registrations={registrationReadModel.registrations}
            source={registrationReadModel.source}
          />
        )}

        <BottomNav
          items={[
            { href: withActiveOrganization("/admin", activeContext.activeOrganizationId), label: "Home" },
            { href: withActiveOrganization("/teams", activeContext.activeOrganizationId), label: "Teams" },
            { href: withActiveOrganization("/admin/registrations", activeContext.activeOrganizationId), label: "Registration" },
            { href: withActiveOrganization("/events", activeContext.activeOrganizationId), label: "Schedule" },
          ]}
        />
      </section>
    </main>
  );
}
