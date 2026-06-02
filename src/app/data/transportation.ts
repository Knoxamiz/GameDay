export type TransportationStatus =
  | "Needs Ride"
  | "Can Offer Ride"
  | "Driving Self"
  | "Unknown"
  | "Not Attending";

export const transportationStatusValues: TransportationStatus[] = [
  "Needs Ride",
  "Can Offer Ride",
  "Driving Self",
  "Unknown",
  "Not Attending",
];

export type TransportationEntry = {
  id: string;
  eventId: string;
  athleteId?: string;
  name: string;
  status: TransportationStatus;
  seatsAvailable?: number;
};

export const transportationOptions: TransportationStatus[] = [
  "Driving Self",
  "Needs Ride",
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
    id: "transport-emma-smith",
    eventId: "practice-jun-2",
    athleteId: "emma-smith",
    name: "Emma Smith",
    status: "Driving Self",
  },
  {
    id: "transport-olivia-smith",
    eventId: "tournament-saturday-10u",
    athleteId: "olivia-smith",
    name: "Olivia Smith",
    status: "Unknown",
  },
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

export function getTransportationEntryByAthleteAndEventId(
  athleteId: string,
  eventId: string,
) {
  return transportationEntries.find(
    (entry) => entry.athleteId === athleteId && entry.eventId === eventId,
  );
}
