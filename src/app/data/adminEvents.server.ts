import {
  hasCapability,
  type AuthSession,
  type AuthSessionSource,
} from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  canManageOrganization,
  canUseAdminSetup,
  getAdminActor,
  resolveAdminOrganizationScope,
  type AdminOrganizationScope,
} from "./adminOrganizationScope.server";
import {
  sortEventsByStartDate,
  type GameDayEvent,
  type GameDayEventStatus,
  type GameDayEventType,
} from "./events";
import { createLiveRecordId } from "./liveIdentity";
import type { Team } from "./teams";

export type AdminEventPayload = {
  address?: string;
  endsAt: string;
  locationName: string;
  notes?: string;
  organizationId: string;
  startsAt: string;
  status: GameDayEventStatus;
  teamIds: string[];
  title: string;
  type: GameDayEventType;
};

export type AdminEventResult = {
  event: GameDayEvent;
  id: string;
  message: string;
  source: "firestore";
};

type AdminEventWriteOptions = {
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

function isAdminEventSession(
  session: AuthSession | null,
): session is AuthSession {
  return session?.claims.role === "admin";
}

async function requireAdminEventSession(source: AuthSessionSource) {
  if (!getFirebaseAdminConfig()) {
    createAdminEventError(
      "firebase-unavailable",
      "Events are not available until Firebase is configured.",
      503,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(source).catch(() => null);

  if (!isAdminEventSession(session)) {
    createAdminEventError(
      "admin-session-required",
      "Please sign in as an admin before creating events.",
      403,
    );
  }

  const scope = await resolveAdminOrganizationScope(session);

  if (!hasCapability(session.claims, "manage-organization") || !canUseAdminSetup(scope)) {
    createAdminEventError(
      "admin-event-capability-required",
      "This admin cannot manage organization events.",
      403,
    );
  }

  if (scope.organizationIds.length === 0) {
    createAdminEventError(
      "admin-organization-scope-required",
      "Create an organization before creating events.",
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
      "This admin cannot create events for that organization.",
      403,
    );
  }
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

async function getValidatedEventTeams(
  organizationId: string,
  teamIds: string[],
) {
  const repositories = createFirestoreRepositories();
  const teams = await Promise.all(
    teamIds.map((teamId) => repositories.teams.getById(teamId)),
  );
  const validTeams = teams.filter((team): team is Team => Boolean(team));

  if (
    validTeams.length !== teamIds.length ||
    validTeams.some((team) => team.organizationId !== organizationId)
  ) {
    createAdminEventError(
      "event-team-scope-invalid",
      "Choose teams that belong to the selected organization.",
      400,
    );
  }

  return validTeams;
}

async function updateEventTeams(
  event: GameDayEvent,
  teams: Team[],
  scope: AdminOrganizationScope,
) {
  const repositories = createFirestoreRepositories();
  const actor = getAdminActor(scope);

  await Promise.all(
    teams.map(async (team) => {
      const eventIds = uniqueStringList([...(team.eventIds ?? []), event.id]);
      const nextEvent = team.nextEventId
        ? await repositories.events.getById(team.nextEventId)
        : null;
      const shouldSetNextEvent =
        event.status !== "canceled" &&
        (!nextEvent ||
          sortEventsByStartDate(event, nextEvent) < 0 ||
          nextEvent.status === "canceled");

      await repositories.teams.update(
        team.id,
        {
          eventIds,
          nextEventId: shouldSetNextEvent ? event.id : team.nextEventId,
          updatedAt: event.updatedAt,
        },
        {
          actor,
          reason: "Admin created an event for this team.",
        },
      );
    }),
  );
}

export async function createAdminEvent(
  payload: AdminEventPayload,
  options: AdminEventWriteOptions,
): Promise<AdminEventResult> {
  const scope = await requireAdminEventSession(options.sessionSource);
  const session = scope.session;
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

  assertManagedOrganization(scope, organizationId);
  assertValidDateRange(startsAt, endsAt);

  const repositories = createFirestoreRepositories();
  const organization = await repositories.organizations.getById(organizationId);

  if (!organization) {
    createAdminEventError(
      "organization-required",
      "Create the organization before creating events.",
      400,
    );
  }

  const teams = await getValidatedEventTeams(organizationId, teamIds);
  const now = new Date().toISOString();
  const event: GameDayEvent = {
    address: normalizeText(payload.address) || undefined,
    createdAt: now,
    createdByUid: session.user.id,
    endsAt,
    id: createLiveRecordId("event", [
      organizationId,
      title,
      startsAt.slice(0, 10),
    ]),
    locationName,
    notes: normalizeText(payload.notes) || undefined,
    organizationId,
    startsAt,
    status: payload.status,
    teamIds,
    title,
    type: payload.type,
    updatedAt: now,
  };

  await repositories.events.create(event, {
    actor: getAdminActor(scope),
    reason: "Admin created organization event.",
  });
  await updateEventTeams(event, teams, scope);

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
