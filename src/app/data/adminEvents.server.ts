import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { runFirestoreTransaction } from "../infrastructure/firebaseRepositories";
import type { RepositoryTransaction } from "../infrastructure/repositories";
import {
  canManageOrganization,
  canUseAdminSetup,
  resolveAdminOrganizationScope,
  verifyAdminAccessSession,
  type AdminOrganizationScope,
} from "./adminOrganizationScope.server";
import {
  eventHasTeamId,
  getEventTeamIds,
  isPublishedEvent,
  sortEventsByStartDate,
  type GameDayEvent,
  type GameDayEventStatus,
  type GameDayEventType,
} from "./events";
import { createLiveRecordId } from "./liveIdentity";
import type { Organization } from "./organizations";
import { isActiveTeam, type Team } from "./teams";

export type AdminEventPayload = {
  address?: string;
  endsAt: string;
  locationName: string;
  notes?: string;
  organizationId: string;
  startsAt: string;
  status: Exclude<GameDayEventStatus, "archived" | "canceled">;
  teamIds: string[];
  title: string;
  type: GameDayEventType;
};

export type AdminEventUpdatePayload = Omit<AdminEventPayload, "status"> & {
  eventId: string;
  status: GameDayEventStatus;
};

export type AdminEventResult = {
  event: GameDayEvent;
  id: string;
  message: string;
  source: "firestore";
};

export type AdminEventSeriesResult = {
  events: GameDayEvent[];
  ids: string[];
  message: string;
  seriesId: string;
  source: "firestore";
};

type AdminEventWriteOptions = {
  activeOrganizationId?: string;
  sessionSource: AuthSessionSource;
};

export class AdminEventError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AdminEventError";
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueStringList(values: string[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function createAdminEventError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new AdminEventError(reason, message, status);
}

async function requireAdminEventSession(source: AuthSessionSource) {
  if (!getFirebaseAdminConfig()) {
    createAdminEventError(
      "firebase-unavailable",
      "Events are not available until Firebase is configured.",
      503,
    );
  }

  const session = await verifyAdminAccessSession(source);

  if (!session) {
    createAdminEventError(
      "admin-session-required",
      "Please sign in as an admin before managing events.",
      403,
    );
  }

  const scope = await resolveAdminOrganizationScope(session);

  if (!canUseAdminSetup(scope)) {
    createAdminEventError(
      "admin-event-capability-required",
      "This admin cannot manage organization events.",
      403,
    );
  }

  if (scope.organizationIds.length === 0) {
    createAdminEventError(
      "admin-organization-scope-required",
      "Create an organization before managing events.",
      403,
    );
  }

  return scope;
}

function assertManagedOrganization(
  scope: AdminOrganizationScope,
  organizationId: string,
) {
  if (!canManageOrganization(scope, organizationId)) {
    createAdminEventError(
      "admin-organization-access-required",
      "This admin cannot manage events for that organization.",
      403,
    );
  }
}

function hasSameMembers(firstValues: string[], secondValues: string[]) {
  if (firstValues.length !== secondValues.length) {
    return false;
  }

  const secondValueSet = new Set(secondValues);

  return firstValues.every((value) => secondValueSet.has(value));
}

function isUpcomingPublishedEvent(event: GameDayEvent, now: string) {
  const endsAt = new Date(event.endsAt || event.endDateTime || "");

  return (
    isPublishedEvent(event) &&
    !Number.isNaN(endsAt.getTime()) &&
    endsAt.getTime() >= new Date(now).getTime()
  );
}

function getNextTeamEvent(
  events: GameDayEvent[],
  teamId: string,
  now: string,
) {
  return events
    .filter((event) => eventHasTeamId(event, teamId))
    .filter((event) => isUpcomingPublishedEvent(event, now))
    .sort(sortEventsByStartDate)[0];
}

function updateTeamEventHelpers(
  transaction: RepositoryTransaction,
  organizationTeams: Team[],
  organizationEvents: GameDayEvent[],
  affectedTeamIds: string[],
  updatedAt: string,
) {
  const affectedTeamIdSet = new Set(affectedTeamIds);

  organizationTeams
    .filter((team) => affectedTeamIdSet.has(team.id))
    .forEach((team) => {
      const eventIds = organizationEvents
        .filter((event) => eventHasTeamId(event, team.id))
        .map((event) => event.id);
      const nextEvent = getNextTeamEvent(
        organizationEvents,
        team.id,
        updatedAt,
      );
      const updatedTeam: Team = {
        ...team,
        eventIds: uniqueStringList(eventIds),
        updatedAt,
      };

      if (nextEvent) {
        updatedTeam.nextEventId = nextEvent.id;
      } else {
        delete updatedTeam.nextEventId;
      }

      transaction.set("teams", team.id, updatedTeam);
    });
}

function validateEventTeams({
  organizationId,
  organizationTeams,
  requireActive,
  teamIds,
}: {
  organizationId: string;
  organizationTeams: Team[];
  requireActive: boolean;
  teamIds: string[];
}) {
  const organizationTeamMap = new Map(
    organizationTeams.map((team) => [team.id, team]),
  );
  const selectedTeams = teamIds
    .map((teamId) => organizationTeamMap.get(teamId))
    .filter((team): team is Team => Boolean(team));

  if (
    selectedTeams.length !== teamIds.length ||
    selectedTeams.some(
      (team) =>
        team.organizationId !== organizationId ||
        (requireActive && !isActiveTeam(team)),
    )
  ) {
    createAdminEventError(
      "event-team-scope-invalid",
      requireActive
        ? "Choose active teams that belong to the selected organization."
        : "Choose teams that belong to the selected organization.",
      400,
    );
  }

  return selectedTeams;
}

function assertValidDateRange(startsAt: string, endsAt: string) {
  const startsAtDate = new Date(startsAt);
  const endsAtDate = new Date(endsAt);

  if (
    Number.isNaN(startsAtDate.getTime()) ||
    Number.isNaN(endsAtDate.getTime())
  ) {
    createAdminEventError(
      "invalid-event-time",
      "Choose a valid start and end time.",
      400,
    );
  }

  if (endsAtDate <= startsAtDate) {
    createAdminEventError(
      "invalid-event-time-range",
      "Event end time must be after the start time.",
      400,
    );
  }
}

function buildAdminEventRecord({
  createdByUid,
  payload,
  seriesId,
  timestamp,
}: {
  createdByUid: string;
  payload: AdminEventPayload;
  seriesId?: string;
  timestamp: string;
}) {
  const organizationId = normalizeText(payload.organizationId);
  const title = normalizeText(payload.title);
  const locationName = normalizeText(payload.locationName);
  const teamIds = uniqueStringList(payload.teamIds);
  const startsAt = normalizeText(payload.startsAt);
  const endsAt = normalizeText(payload.endsAt);
  const address = normalizeText(payload.address);
  const notes = normalizeText(payload.notes);
  const event: GameDayEvent = {
    ...(address ? { address } : {}),
    createdAt: timestamp,
    createdByUid,
    endsAt,
    id: createLiveRecordId("event", [
      organizationId,
      title,
      startsAt.slice(0, 10),
    ]),
    locationName,
    ...(notes ? { notes } : {}),
    organizationId,
    ...(seriesId ? { seriesId } : {}),
    startsAt,
    status: payload.status,
    teamIds,
    title,
    type: payload.type,
    updatedAt: timestamp,
  };

  return event;
}

function assertValidEventPayload(
  payload: AdminEventPayload,
  activeOrganizationId: string,
) {
  const organizationId = normalizeText(payload.organizationId);
  const title = normalizeText(payload.title);
  const locationName = normalizeText(payload.locationName);
  const teamIds = uniqueStringList(payload.teamIds);
  const startsAt = normalizeText(payload.startsAt);
  const endsAt = normalizeText(payload.endsAt);

  if (!organizationId || !title || !locationName || teamIds.length === 0) {
    createAdminEventError(
      "invalid-event",
      "Organization, team, title, and location are required.",
      400,
    );
  }

  if (!activeOrganizationId || activeOrganizationId !== organizationId) {
    createAdminEventError(
      "active-organization-mismatch",
      "Create events only inside the active organization.",
      403,
    );
  }

  assertValidDateRange(startsAt, endsAt);
}

export async function createAdminEvent(
  payload: AdminEventPayload,
  options: AdminEventWriteOptions,
): Promise<AdminEventResult> {
  const scope = await requireAdminEventSession(options.sessionSource);
  const session = scope.session;
  const organizationId = normalizeText(payload.organizationId);
  const activeOrganizationId = normalizeText(options.activeOrganizationId);
  const teamIds = uniqueStringList(payload.teamIds);

  assertValidEventPayload(payload, activeOrganizationId);
  assertManagedOrganization(scope, organizationId);

  const now = new Date().toISOString();
  const event = buildAdminEventRecord({
    createdByUid: session.user.id,
    payload,
    timestamp: now,
  });

  await runFirestoreTransaction(async (transaction) => {
    const [organization, organizationTeams, organizationEvents] =
      await Promise.all([
        transaction.get<Organization>("organizations", organizationId),
        transaction.list<Team>("teams", { scope: { organizationId } }),
        transaction.list<GameDayEvent>("events", {
          scope: { organizationId },
        }),
      ]);

    if (!organization) {
      createAdminEventError(
        "organization-required",
        "Create the organization before creating events.",
        400,
      );
    }

    validateEventTeams({
      organizationId,
      organizationTeams,
      requireActive: true,
      teamIds,
    });

    transaction.create("events", event.id, event);
    updateTeamEventHelpers(
      transaction,
      organizationTeams,
      [...organizationEvents, event],
      teamIds,
      now,
    );
  });

  console.info("Admin event created.", {
    eventId: event.id,
    organizationId: event.organizationId,
    teamCount: event.teamIds.length,
  });

  return {
    event,
    id: event.id,
    message: `Event created: ${event.title}`,
    source: "firestore",
  };
}

export async function createAdminEventSeries(
  payloads: AdminEventPayload[],
  options: AdminEventWriteOptions,
): Promise<AdminEventSeriesResult> {
  const scope = await requireAdminEventSession(options.sessionSource);
  const session = scope.session;
  const activeOrganizationId = normalizeText(options.activeOrganizationId);
  const safePayloads = payloads.filter(Boolean);

  if (safePayloads.length === 0) {
    createAdminEventError(
      "invalid-event-series",
      "Choose at least one event date.",
      400,
    );
  }

  if (safePayloads.length > 80) {
    createAdminEventError(
      "event-series-too-large",
      "Create 80 or fewer events at a time.",
      400,
    );
  }

  const organizationId = normalizeText(safePayloads[0]?.organizationId);

  if (!organizationId) {
    createAdminEventError(
      "invalid-event-series-organization",
      "Choose an organization before creating events.",
      400,
    );
  }

  assertManagedOrganization(scope, organizationId);

  safePayloads.forEach((payload) => {
    if (normalizeText(payload.organizationId) !== organizationId) {
      createAdminEventError(
        "event-series-organization-mismatch",
        "Create one organization schedule at a time.",
        400,
      );
    }

    assertValidEventPayload(payload, activeOrganizationId);
  });

  const now = new Date().toISOString();
  const seriesId = createLiveRecordId("event-series", [
    organizationId,
    safePayloads[0]?.title ?? "schedule",
    safePayloads[0]?.startsAt?.slice(0, 10) ?? now.slice(0, 10),
  ]);
  const eventsToCreate = safePayloads.map((payload) =>
    buildAdminEventRecord({
      createdByUid: session.user.id,
      payload,
      seriesId,
      timestamp: now,
    }),
  );
  const affectedTeamIds = uniqueStringList(
    eventsToCreate.flatMap((event) => event.teamIds),
  );

  await runFirestoreTransaction(async (transaction) => {
    const [organization, organizationTeams, organizationEvents] =
      await Promise.all([
        transaction.get<Organization>("organizations", organizationId),
        transaction.list<Team>("teams", { scope: { organizationId } }),
        transaction.list<GameDayEvent>("events", {
          scope: { organizationId },
        }),
      ]);

    if (!organization) {
      createAdminEventError(
        "organization-required",
        "Create the organization before creating events.",
        400,
      );
    }

    eventsToCreate.forEach((event) => {
      validateEventTeams({
        organizationId,
        organizationTeams,
        requireActive: true,
        teamIds: event.teamIds,
      });

      transaction.create("events", event.id, event);
    });

    updateTeamEventHelpers(
      transaction,
      organizationTeams,
      [...organizationEvents, ...eventsToCreate],
      affectedTeamIds,
      now,
    );
  });

  console.info("Admin event series created.", {
    eventCount: eventsToCreate.length,
    organizationId,
    seriesId,
    teamCount: affectedTeamIds.length,
  });

  return {
    events: eventsToCreate,
    ids: eventsToCreate.map((event) => event.id),
    message: `${eventsToCreate.length} events created.`,
    seriesId,
    source: "firestore",
  };
}

export async function updateAdminEvent(
  payload: AdminEventUpdatePayload,
  options: AdminEventWriteOptions,
): Promise<AdminEventResult> {
  const scope = await requireAdminEventSession(options.sessionSource);
  const session = scope.session;
  const eventId = normalizeText(payload.eventId);
  const organizationId = normalizeText(payload.organizationId);
  const activeOrganizationId = normalizeText(options.activeOrganizationId);
  const title = normalizeText(payload.title);
  const locationName = normalizeText(payload.locationName);
  const teamIds = uniqueStringList(payload.teamIds);
  const startsAt = normalizeText(payload.startsAt);
  const endsAt = normalizeText(payload.endsAt);

  if (
    !eventId ||
    !organizationId ||
    !title ||
    !locationName ||
    teamIds.length === 0
  ) {
    createAdminEventError(
      "invalid-event-update",
      "Event, organization, team, title, and location are required.",
      400,
    );
  }

  if (!activeOrganizationId || activeOrganizationId !== organizationId) {
    createAdminEventError(
      "active-organization-mismatch",
      "Update events only inside the active organization.",
      403,
    );
  }

  assertManagedOrganization(scope, organizationId);
  assertValidDateRange(startsAt, endsAt);

  const now = new Date().toISOString();
  const address = normalizeText(payload.address);
  const notes = normalizeText(payload.notes);
  const event = await runFirestoreTransaction(async (transaction) => {
    const [currentEvent, organization, organizationTeams, organizationEvents] =
      await Promise.all([
        transaction.get<GameDayEvent>("events", eventId),
        transaction.get<Organization>("organizations", organizationId),
        transaction.list<Team>("teams", { scope: { organizationId } }),
        transaction.list<GameDayEvent>("events", {
          scope: { organizationId },
        }),
      ]);

    if (!currentEvent) {
      createAdminEventError("event-not-found", "Event not found.", 404);
    }

    if (!organization) {
      createAdminEventError(
        "organization-required",
        "The event organization no longer exists.",
        409,
      );
    }

    if (currentEvent.organizationId !== organizationId) {
      createAdminEventError(
        "event-organization-immutable",
        "An event cannot be moved to another organization.",
        403,
      );
    }

    const currentTeamIds = getEventTeamIds(currentEvent);
    const teamIdsChanged = !hasSameMembers(currentTeamIds, teamIds);
    const movesToOperationalStatus =
      payload.status !== currentEvent.status &&
      (payload.status === "draft" || payload.status === "published");
    validateEventTeams({
      organizationId,
      organizationTeams,
      requireActive: teamIdsChanged || movesToOperationalStatus,
      teamIds,
    });

    const updatedEvent: GameDayEvent = {
      ...currentEvent,
      createdAt: currentEvent.createdAt,
      createdByUid: currentEvent.createdByUid,
      endsAt,
      id: currentEvent.id,
      locationName,
      organizationId: currentEvent.organizationId,
      startsAt,
      status: payload.status,
      teamIds,
      title,
      type: payload.type,
      updatedAt: now,
    };

    delete updatedEvent.date;
    delete updatedEvent.endDateTime;
    delete updatedEvent.lastUpdated;
    delete updatedEvent.location;
    delete updatedEvent.shortDate;
    delete updatedEvent.startDateTime;
    delete updatedEvent.teamId;
    delete updatedEvent.time;

    if (address) {
      updatedEvent.address = address;
    } else {
      delete updatedEvent.address;
    }

    if (notes) {
      updatedEvent.notes = notes;
    } else {
      delete updatedEvent.notes;
    }

    if (payload.status === "canceled") {
      updatedEvent.canceledAt = currentEvent.canceledAt ?? now;
      updatedEvent.canceledByUid =
        currentEvent.canceledByUid ?? session.user.id;
    } else if (payload.status !== "archived") {
      delete updatedEvent.canceledAt;
      delete updatedEvent.canceledByUid;
    }

    if (payload.status === "archived") {
      updatedEvent.archivedAt = currentEvent.archivedAt ?? now;
      updatedEvent.archivedByUid =
        currentEvent.archivedByUid ?? session.user.id;
    } else {
      delete updatedEvent.archivedAt;
      delete updatedEvent.archivedByUid;
    }

    const finalOrganizationEvents = organizationEvents.map((candidate) =>
      candidate.id === updatedEvent.id ? updatedEvent : candidate,
    );
    const affectedTeamIds = uniqueStringList([
      ...currentTeamIds,
      ...updatedEvent.teamIds,
    ]);

    transaction.set("events", updatedEvent.id, updatedEvent);
    updateTeamEventHelpers(
      transaction,
      organizationTeams,
      finalOrganizationEvents,
      affectedTeamIds,
      now,
    );

    return updatedEvent;
  });

  console.info("Admin event updated.", {
    eventId: event.id,
    organizationId: event.organizationId,
    status: event.status,
    teamCount: event.teamIds.length,
  });

  return {
    event,
    id: event.id,
    message:
      event.status === "archived"
        ? `Event archived: ${event.title}. Historical responses were preserved.`
        : `Event updated: ${event.title}`,
    source: "firestore",
  };
}
