import EventDetails from "../../components/EventDetails";
import { redirect } from "next/navigation";
import {
  getRequestedOrganizationId,
  withActiveOrganization,
} from "../../data/activeOrganization";
import { resolveActiveAdminOrganizationContext } from "../../data/adminOrganizationScope.server";
import { getCurrentAuthSession } from "../../data/currentUser.server";
import { resolveSessionAccessRole } from "../../data/sessionAccess.server";

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    organizationId?: string | string[];
    view?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function EventDetailsPage({
  params,
  searchParams,
}: EventDetailsPageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;
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
          getRequestedOrganizationId(resolvedSearchParams?.organizationId),
        )
      : undefined;

  if (role === "admin" && activeContext?.requiresSelection) {
    redirect("/admin");
  }

  if (role === "admin" && activeContext) {
    redirect(
      withActiveOrganization(
        `/admin/schedule/${eventId}`,
        activeContext.activeOrganizationId,
      ),
    );
  }

  if (role === "admin" && !activeContext?.activeOrganizationId) {
    redirect("/admin/schedule");
  }

  const view = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams?.view[0]
    : resolvedSearchParams?.view;
  const mode = view === "ride-share" ? "ride-share" : "full";

  return (
    <EventDetails
      activeOrganizationId={activeContext?.activeOrganizationId}
      eventId={eventId}
      mode={mode}
      role={role}
    />
  );
}
