import { getParentById } from "./parents";
import type { TransportationEntry } from "./transportation";

export type RideShareLocationPreference =
  | "Field meetup"
  | "School meetup"
  | "Approved meetup spot"
  | "Custom pickup needed";

export type RideShareMatchStatus = "Open" | "Requested" | "Confirmed";

export const rideShareMatchStatusValues: RideShareMatchStatus[] = [
  "Open",
  "Requested",
  "Confirmed",
];

export type RideShareParticipant = TransportationEntry & {
  contactHref?: string;
  dropoffPreference: RideShareLocationPreference;
  guardianName: string;
  pickupPreference: RideShareLocationPreference;
  publicNote: string;
};

export type RideShareMatch = {
  id: string;
  driver: RideShareParticipant;
  eventId: string;
  initialStatus: RideShareMatchStatus;
  privateDetailCopy: string;
  publicNote: string;
  rider: RideShareParticipant;
};

type RideShareParticipantDetails = {
  dropoffPreference: RideShareLocationPreference;
  pickupPreference: RideShareLocationPreference;
  publicNote: string;
};

type RideShareMatchSeed = {
  driverEntryId: string;
  eventId: string;
  riderEntryId: string;
  status: RideShareMatchStatus;
};

export const rideShareSafetyRules = [
  "No home address is shown on the team or event board.",
  "Pickup details are shared only inside a confirmed ride match.",
  "Coach and admin views can monitor ride needs without exposing private addresses.",
];

const rideShareParticipantDetailsByEntryId: Record<
  string,
  RideShareParticipantDetails
> = {};

const rideShareMatchSeeds: RideShareMatchSeed[] = [];

function getDefaultParticipantDetails(
  entry: TransportationEntry,
): RideShareParticipantDetails {
  const needsRide = entry.status === "Needs Ride";

  return {
    dropoffPreference: "Field meetup",
    pickupPreference: needsRide ? "Custom pickup needed" : "Field meetup",
    publicNote: needsRide
      ? "Pickup details stay private until a ride is confirmed."
      : "Available ride details stay private until a ride is confirmed.",
  };
}

export function getRideShareMatchId(
  eventId: string,
  riderEntryId: string,
  driverEntryId: string,
) {
  return `ride-share.${eventId}.${riderEntryId}.${driverEntryId}`;
}

function getInitialMatchStatus(
  eventId: string,
  riderEntryId: string,
  driverEntryId: string,
) {
  return (
    rideShareMatchSeeds.find(
      (match) =>
        match.eventId === eventId &&
        match.riderEntryId === riderEntryId &&
        match.driverEntryId === driverEntryId,
    )?.status ?? "Open"
  );
}

export function enrichRideShareParticipant(
  entry: TransportationEntry,
): RideShareParticipant {
  const parent = entry.parentId ? getParentById(entry.parentId) : undefined;

  return {
    ...entry,
    ...getDefaultParticipantDetails(entry),
    ...rideShareParticipantDetailsByEntryId[entry.id],
    contactHref: parent ? `mailto:${parent.email}` : undefined,
    guardianName: parent?.name ?? `${entry.name} Family`,
  };
}

export function buildRideShareMatches(
  eventId: string,
  entries: TransportationEntry[],
) {
  const participants = entries.map(enrichRideShareParticipant);
  const riders = participants.filter((entry) => entry.status === "Needs Ride");
  const drivers = participants.filter(
    (entry) => entry.status === "Can Offer Ride",
  );
  const matches = riders.flatMap((rider) =>
    drivers.map<RideShareMatch>((driver) => ({
      driver,
      eventId,
      id: getRideShareMatchId(eventId, rider.id, driver.id),
      initialStatus: getInitialMatchStatus(eventId, rider.id, driver.id),
      privateDetailCopy:
        "Private pickup and dropoff details unlock only for the matched parents after confirmation.",
      publicNote: `${rider.name} can be matched with ${driver.guardianName}.`,
      rider,
    })),
  );

  return {
    drivers,
    matches,
    participants,
    riders,
  };
}
