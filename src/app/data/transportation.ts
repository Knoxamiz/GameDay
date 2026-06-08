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
  parentId?: string;
  status: TransportationStatus;
  seatsAvailable?: number;
};

export type TransportationSummary = {
  eventId: string;
  totalUpdates: number;
  needsRide: number;
  canOfferRide: number;
  drivingSelf: number;
  unknown: number;
  notAttending: number;
  seatsAvailable: number;
};

export const transportationOptions: TransportationStatus[] = [
  "Driving Self",
  "Needs Ride",
  "Can Offer Ride",
];

export const transportationEntries: TransportationEntry[] = [
  {
    id: "transport-emma-smith",
    eventId: "practice-jun-2",
    athleteId: "emma-smith",
    name: "Emma Smith",
    parentId: "jennifer-smith",
    status: "Driving Self",
  },
  {
    id: "transport-olivia-smith",
    eventId: "tournament-saturday-10u",
    athleteId: "olivia-smith",
    name: "Olivia Smith",
    parentId: "jennifer-smith",
    status: "Unknown",
  },
  {
    id: "transport-sarah-jones",
    eventId: "practice-jun-2",
    athleteId: "sarah-jones",
    name: "Sarah Jones",
    parentId: "sarah-jones-parent",
    status: "Needs Ride",
  },
  {
    id: "transport-jennifer-smith",
    eventId: "practice-jun-2",
    name: "Jennifer Smith",
    parentId: "jennifer-smith",
    status: "Can Offer Ride",
    seatsAvailable: 2,
  },
];

export function summarizeTransportationEntries(
  eventId: string,
  entries: TransportationEntry[],
): TransportationSummary {
  return entries.reduce<TransportationSummary>(
    (summary, entry) => {
      if (entry.status === "Needs Ride") {
        summary.needsRide += 1;
      }

      if (entry.status === "Can Offer Ride") {
        summary.canOfferRide += 1;
        summary.seatsAvailable += entry.seatsAvailable ?? 0;
      }

      if (entry.status === "Driving Self") {
        summary.drivingSelf += 1;
      }

      if (entry.status === "Unknown") {
        summary.unknown += 1;
      }

      if (entry.status === "Not Attending") {
        summary.notAttending += 1;
      }

      summary.totalUpdates += 1;

      return summary;
    },
    {
      eventId,
      totalUpdates: 0,
      needsRide: 0,
      canOfferRide: 0,
      drivingSelf: 0,
      unknown: 0,
      notAttending: 0,
      seatsAvailable: 0,
    },
  );
}

export function getTransportationEntriesByEventId(eventId: string) {
  return transportationEntries.filter((entry) => entry.eventId === eventId);
}

export function getTransportationSummaryByEventId(eventId: string) {
  return summarizeTransportationEntries(
    eventId,
    getTransportationEntriesByEventId(eventId),
  );
}

export const transportationIssueCount = new Set(
  transportationEntries
    .filter((entry) => entry.status === "Needs Ride")
    .map((entry) => entry.eventId),
).size;

export function getTransportationEntryByAthleteAndEventId(
  athleteId: string,
  eventId: string,
) {
  return transportationEntries.find(
    (entry) => entry.athleteId === athleteId && entry.eventId === eventId,
  );
}
