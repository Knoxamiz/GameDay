export type TransportationEntry = {
  id: string;
  eventId: string;
  athleteId?: string;
  name: string;
  status: "Needs Ride" | "Can Offer Ride" | "Driving Self" | "Unknown";
  seatsAvailable?: number;
};

export const transportationOptions = [
  "Driving Self",
  "Need Ride",
  "Can Offer Ride",
];

export const transportationIssueCount = 1;

export const transportationSummaries = [
  {
    eventId: "practice-jun-2",
    needsRide: 2,
    canOfferRide: 3,
  },
];

export const transportationEntries: TransportationEntry[] = [
  {
    id: "transport-sarah-jones",
    eventId: "practice-jun-2",
    athleteId: "sarah-jones",
    name: "Sarah Jones",
    status: "Needs Ride",
  },
  {
    id: "transport-jennifer-smith",
    eventId: "practice-jun-2",
    name: "Jennifer Smith",
    status: "Can Offer Ride",
    seatsAvailable: 2,
  },
];

export function getTransportationSummaryByEventId(eventId: string) {
  return (
    transportationSummaries.find((summary) => summary.eventId === eventId) ?? {
      eventId,
      needsRide: 0,
      canOfferRide: 0,
    }
  );
}

export function getTransportationEntriesByEventId(eventId: string) {
  return transportationEntries.filter((entry) => entry.eventId === eventId);
}
