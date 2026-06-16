import { redirect } from "next/navigation";
import EventDetails from "../../../components/EventDetails";
import {
  getRequestedOrganizationId,
} from "../../../data/activeOrganization";
import {
  canAccessAdmin,
  resolveActiveAdminOrganizationContext,
} from "../../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../../data/currentUser.server";
import { getLandingRouteForSession } from "../../../data/sessionAccess.server";

type AdminEventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    organizationId?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function AdminEventDetailsPage({
  params,
  searchParams,
}: AdminEventDetailsPageProps) {
  const { eventId } = await params;
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
    redirect("/admin/schedule");
  }

  return (
    <EventDetails
      activeOrganizationId={activeContext.activeOrganizationId}
      eventId={eventId}
      role="admin"
    />
  );
}
