import EventDetails from "../../components/EventDetails";
import { redirect } from "next/navigation";
import { getCurrentAuthSession } from "../../data/currentUser.server";

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
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

  const role = session.claims.role;
  const view = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams?.view[0]
    : resolvedSearchParams?.view;
  const mode = view === "ride-share" ? "ride-share" : "full";

  return <EventDetails eventId={eventId} mode={mode} role={role} />;
}
