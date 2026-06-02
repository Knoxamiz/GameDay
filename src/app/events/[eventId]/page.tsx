import EventDetails from "../../components/EventDetails";
import { events } from "../../data/events";

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export function generateStaticParams() {
  return events.map((event) => ({
    eventId: event.id,
  }));
}

export default async function EventDetailsPage({
  params,
}: EventDetailsPageProps) {
  const { eventId } = await params;

  return <EventDetails eventId={eventId} />;
}
