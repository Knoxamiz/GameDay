import EventDetails from "../../components/EventDetails";
import { getMvpNavRole } from "../../components/MvpNav";
import { events } from "../../data/events";

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    role?: string | string[];
    view?: string | string[];
  }>;
};

export function generateStaticParams() {
  return events.map((event) => ({
    eventId: event.id,
  }));
}

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
