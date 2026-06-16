import { redirect } from "next/navigation";
import TeamDetails from "../../../components/TeamDetails";
import {
  getRequestedOrganizationId,
} from "../../../data/activeOrganization";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../../data/currentUser.server";
import { getLandingRouteForSession } from "../../../data/sessionAccess.server";

type AdminTeamDetailsPageProps = {
  params: Promise<{
    teamId: string;
  }>;
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminTeamDetailsPage({
  params,
  searchParams,
}: AdminTeamDetailsPageProps) {
  const { teamId } = await params;
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const activeContext = await resolveActiveAdminOrganizationContext(
    session,
    getRequestedOrganizationId((await searchParams)?.organizationId),
  );

  if (!canAccessAdmin(activeContext.scope)) {
    redirect(await getLandingRouteForSession(session, session.claims.role));
  }

  if (!activeContext.activeOrganizationId) {
    redirect("/admin/teams");
  }

  return (
    <TeamDetails
      activeOrganizationId={activeContext.activeOrganizationId}
      role="admin"
      teamId={teamId}
    />
  );
}
