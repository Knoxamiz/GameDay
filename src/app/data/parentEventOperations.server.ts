import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { runFirestoreTransaction } from "../infrastructure/firebaseRepositories";
import type { Athlete } from "./athletes";
import {
  attendanceStatusValues,
  type AttendanceEntry,
  type AttendanceStatus,
} from "./attendance";
import { eventHasTeamId, type GameDayEvent } from "./events";
import { getLiveParentId, getLiveParentUid } from "./liveIdentity";
import type { Registration } from "./registrations";
import {
  transportationStatusValues,
  type TransportationEntry,
  type TransportationStatus,
} from "./transportation";

type ParentEventOperationOptions = {
  sessionSource: AuthSessionSource;
};

export class ParentEventOperationError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ParentEventOperationError";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function createOperationError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new ParentEventOperationError(reason, message, status);
}

async function getParentOperationIdentity(options: ParentEventOperationOptions) {
  if (!getFirebaseAdminConfig()) {
    createOperationError(
      "firebase-unavailable",
      "This action is not available until Firebase is configured.",
      503,
    );
  }

  const session = await new FirebaseAdminAuthProvider()
    .verifySession(options.sessionSource)
    .catch(() => null);
  const parentId = getLiveParentId(session);
  const parentUid = getLiveParentUid(session);

  if (!session || session.claims.role !== "parent" || !parentId || !parentUid) {
    createOperationError(
      "parent-session-required",
      "Please sign in as a parent before updating event status.",
      403,
    );
  }

  return { parentId, parentUid };
}

function assertOwnedEventContext({
  athlete,
  event,
  parentId,
  parentUid,
  registration,
}: {
  athlete: Athlete | null;
  event: GameDayEvent | null;
  parentId: string;
  parentUid: string;
  registration: Registration | null;
}) {
  if (
    !athlete ||
    athlete.parentId !== parentId ||
    (athlete.ownerUid && athlete.ownerUid !== parentUid) ||
    (athlete.parentUid && athlete.parentUid !== parentUid)
  ) {
    createOperationError(
      "athlete-not-owned",
      "Could not find an athlete owned by this parent.",
      404,
    );
  }

  if (
    !registration ||
    registration.athleteId !== athlete.id ||
    registration.parentId !== parentId ||
    (registration.ownerUid && registration.ownerUid !== parentUid) ||
    (registration.parentUid && registration.parentUid !== parentUid)
  ) {
    createOperationError(
      "registration-not-owned",
      "Could not find an active registration owned by this parent.",
      404,
    );
  }

  if (
    !event ||
    event.organizationId !== registration.organizationId ||
    !eventHasTeamId(event, registration.teamId)
  ) {
    createOperationError(
      "event-not-in-registration-scope",
      "This event is not available for the athlete's registered team.",
      403,
    );
  }

  if (event.status !== "published") {
    createOperationError(
      "event-updates-closed",
      "Attendance and transportation updates are closed for this event.",
      409,
    );
  }
}

export async function updateParentAttendanceStatus(
  eventIdValue: string,
  athleteIdValue: string,
  statusValue: unknown,
  options: ParentEventOperationOptions,
) {
  const eventId = normalizeText(eventIdValue);
  const athleteId = normalizeText(athleteIdValue);
  const status = normalizeText(statusValue) as AttendanceStatus;

  if (!eventId || !athleteId || !attendanceStatusValues.includes(status)) {
    createOperationError(
      "invalid-attendance-update",
      "Choose a valid attendance status.",
      400,
    );
  }

  const { parentId, parentUid } = await getParentOperationIdentity(options);
  const entryId = `attendance-${eventId}-${athleteId}`;
  const updatedAt = new Date().toISOString();

  return runFirestoreTransaction(async (transaction) => {
    const [athlete, event, existingEntry] = await Promise.all([
      transaction.get<Athlete>("athletes", athleteId),
      transaction.get<GameDayEvent>("events", eventId),
      transaction.get<AttendanceEntry>("attendance", entryId),
    ]);
    const registration = athlete?.registrationId
      ? await transaction.get<Registration>(
          "registrations",
          athlete.registrationId,
        )
      : null;

    assertOwnedEventContext({
      athlete,
      event,
      parentId,
      parentUid,
      registration,
    });

    const entry: AttendanceEntry = {
      athleteId,
      createdAt: existingEntry?.createdAt ?? updatedAt,
      createdByUid: existingEntry?.createdByUid ?? parentUid,
      eventId,
      id: entryId,
      name: athlete?.name ?? "Athlete",
      organizationId: registration?.organizationId,
      ownerUid: parentUid,
      parentId,
      parentUid,
      status,
      teamId: registration?.teamId,
      updatedAt,
    };

    if (existingEntry) {
      transaction.set("attendance", entryId, entry);
    } else {
      transaction.create("attendance", entryId, entry);
    }

    return entry;
  });
}

export async function updateParentTransportationStatus(
  eventIdValue: string,
  athleteIdValue: string,
  statusValue: unknown,
  options: ParentEventOperationOptions,
) {
  const eventId = normalizeText(eventIdValue);
  const athleteId = normalizeText(athleteIdValue);
  const status = normalizeText(statusValue) as TransportationStatus;

  if (!eventId || !athleteId || !transportationStatusValues.includes(status)) {
    createOperationError(
      "invalid-transportation-update",
      "Choose a valid transportation status.",
      400,
    );
  }

  const { parentId, parentUid } = await getParentOperationIdentity(options);
  const entryId = `transportation-${eventId}-${athleteId}`;
  const updatedAt = new Date().toISOString();

  return runFirestoreTransaction(async (transaction) => {
    const [athlete, event, existingEntry] = await Promise.all([
      transaction.get<Athlete>("athletes", athleteId),
      transaction.get<GameDayEvent>("events", eventId),
      transaction.get<TransportationEntry>("transportation", entryId),
    ]);
    const registration = athlete?.registrationId
      ? await transaction.get<Registration>(
          "registrations",
          athlete.registrationId,
        )
      : null;

    assertOwnedEventContext({
      athlete,
      event,
      parentId,
      parentUid,
      registration,
    });

    const entry: TransportationEntry = {
      athleteId,
      createdAt: existingEntry?.createdAt ?? updatedAt,
      createdByUid: existingEntry?.createdByUid ?? parentUid,
      eventId,
      id: entryId,
      name: athlete?.name ?? "Athlete",
      organizationId: registration?.organizationId,
      ownerUid: parentUid,
      parentId,
      parentUid,
      seatsAvailable: status === "Can Offer Ride" ? 1 : 0,
      status,
      teamId: registration?.teamId,
      updatedAt,
    };

    if (existingEntry) {
      transaction.set("transportation", entryId, entry);
    } else {
      transaction.create("transportation", entryId, entry);
    }

    return entry;
  });
}
