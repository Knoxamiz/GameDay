import TeamDetails from "../../components/TeamDetails";
import { redirect } from "next/navigation";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../../data/activeOrganization";
import { resolveActiveAdminOrganizationContext } from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { resolveSessionAccessRole } from "../../data/sessionAccess.server";

type TeamDetailsPageProps = {
  params: Promise<{
    teamId: string;
  }>;
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function TeamDetailsPage({
  params,
  searchParams,
}: TeamDetailsPageProps) {
  const { teamId } = await params;
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/login");
  }

  const role = await resolveSessionAccessRole(session);

  if (role === "authenticated") {
    redirect("/account");
  }
  const activeContext =
    role === "admin"
      ? await resolveActiveAdminOrganizationContext(
          session,
          getRequestedOrganizationId((await searchParams)?.organizationId),
        )
      : undefined;

  if (role === "admin" && activeContext?.requiresSelection) {
    redirect("/admin");
  }

  if (role === "admin" && activeContext) {
    redirect(
      withActiveOrganization(
        `/admin/teams/${teamId}`,
        activeContext.activeOrganizationId,
      ),
    );
  }

  if (role === "admin" && !activeContext?.activeOrganizationId) {
    redirect("/admin/teams");
  }

  return (
    <TeamDetails
      activeOrganizationId={activeContext?.activeOrganizationId}
      role={role}
      teamId={teamId}
    />
  );
}
