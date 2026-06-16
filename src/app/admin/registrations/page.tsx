import Link from "next/link";
import { redirect } from "next/navigation";
import AdminAppShell from "../../components/AdminAppShell";
import AdminJoinLinkButton from "../../components/AdminJoinLinkButton";
import RegistrationReviewBoard from "../../components/RegistrationReviewBoard";
import { buildAdminOperatingModel } from "../../data/adminOperatingModel";
import { getAdminHomeReadModel } from "../../data/adminHomeRead.server";
import { getAdminRegistrationReadModel } from "../../data/adminRegistrationRead.server";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../../data/activeOrganization";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { getOrganizationWorkspaceType } from "../../data/organizations";
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
  const [registrationReadModel, adminHomeReadModel] = await Promise.all([
    getAdminRegistrationReadModel(activeContext.activeOrganizationId),
    activeContext.activeOrganizationId
      ? getAdminHomeReadModel(activeContext.activeOrganizationId)
      : Promise.resolve(null),
  ]);
  const operatingModel = adminHomeReadModel
    ? buildAdminOperatingModel({
        coachAssignments: adminHomeReadModel.coachAssignments,
        events: adminHomeReadModel.events,
        registrationInvites: adminHomeReadModel.registrationInvites,
        registrations: registrationReadModel.registrations,
        teams: adminHomeReadModel.teams,
        workspaceType: getOrganizationWorkspaceType(adminHomeReadModel.organization),
      })
    : null;
  const setupHref = withActiveOrganization(
    "/admin/setup#registration-invites",
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
        <>
          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-bold">Registration Pipeline</h2>
            <p className="mt-2 text-sm text-slate-300">
              Setup and invites come first; review and roster work appears after
              parents submit through a real open invite.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="text-slate-400">Open Invites</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {operatingModel?.openInvites.length ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="text-slate-400">Registrations</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {registrationReadModel.registrations.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="text-slate-400">Pending Review</p>
                <p className="mt-1 text-xl font-bold text-yellow-200">
                  {operatingModel?.pendingRegistrations.length ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="text-slate-400">Ready To Roster</p>
                <p className="mt-1 text-xl font-bold text-blue-300">
                  {operatingModel?.approvedNotRosteredRegistrations.length ?? 0}
                </p>
              </div>
            </div>
            {registrationReadModel.registrations.length === 0 && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
                {operatingModel?.openInvites[0] ? (
                  <>
                    <p className="font-semibold text-white">
                      Registration is open. Share the join link with families.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <AdminJoinLinkButton
                        className="rounded-md bg-blue-500 px-4 py-3 text-sm font-semibold text-white"
                        joinPath={`/join/${operatingModel.openInvites[0].inviteCode}`}
                      />
                      <Link
                        className="rounded-md border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200"
                        href={setupHref}
                      >
                        View invite controls
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-white">
                      No registrations exist yet because no open invite is ready.
                    </p>
                    <Link
                      className="mt-3 inline-block rounded-md bg-blue-500 px-4 py-3 text-sm font-semibold text-white"
                      href={setupHref}
                    >
                      Open registration
                    </Link>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="scroll-mt-4" id="review">
            <div className="scroll-mt-4" id="roster" />
            <div className="scroll-mt-4" id="readiness" />
            <RegistrationReviewBoard
              activeOrganizationId={activeContext.activeOrganizationId}
              registrations={registrationReadModel.registrations}
              source={registrationReadModel.source}
            />
          </section>
        </>
      )}
    </AdminAppShell>
  );
}
