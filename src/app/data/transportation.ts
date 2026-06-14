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
  createdAt?: string;
  createdByUid?: string;
  name: string;
  organizationId?: string;
  ownerUid?: string;
  parentId?: string;
  parentUid?: string;
  status: TransportationStatus;
  teamId?: string;
  updatedAt?: string;
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

export const transportationEntries: TransportationEntry[] = [];

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
