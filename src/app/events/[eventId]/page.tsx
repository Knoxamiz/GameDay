import EventDetails from "../../components/EventDetails";
import { getMvpNavRole } from "../../components/MvpNav";

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    role?: string | string[];
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
  const role = getMvpNavRole(resolvedSearchParams?.role);
  const view = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams?.view[0]
    : resolvedSearchParams?.view;
  const mode = view === "ride-share" ? "ride-share" : "full";

  return <EventDetails eventId={eventId} mode={mode} role={role} />;
}
