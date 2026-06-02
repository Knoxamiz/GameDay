import EventDetails from "../../components/EventDetails";
import { getMvpNavRole } from "../../components/MvpNav";
import { events } from "../../data/events";

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    role?: string | string[];
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
  const role = getMvpNavRole((await searchParams)?.role);

  return <EventDetails eventId={eventId} role={role} />;
}
