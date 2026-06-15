import { cookies, headers } from "next/headers";
import {
  type AuthSession,
  type AuthSessionSource,
} from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  canAccessAdmin,
  canManageOrganization,
  canUseAdminSetup,
  resolveAdminOrganizationScope,
} from "./adminOrganizationScope.server";
import {
  getCoachAssignedTeams,
  resolveCoachAssignmentScope,
} from "./coachAssignments.server";
import {
  eventHasTeamId,
  getEventTeamIds,
  isEventVisibleToNonAdmin,
  sortEventsByStartDate,
  type GameDayEvent,
} from "./events";
import { getLiveParentId } from "./liveIdentity";
import {
  isParentEventEligibleRegistration,
  type Registration,
} from "./registrations";
import type { Team } from "./teams";

export type EventScheduleRole = "admin" | "coach" | "parent" | "shared";

export type EventScheduleReadModel = {
  canCreateEvents: boolean;
  events: GameDayEvent[];
  organizationIds: string[];
  role: EventScheduleRole;
  source: "empty" | "firestore";
  teams: Team[];
};

export type ScopedEventDetailsReadModel = EventScheduleReadModel & {
  event: GameDayEvent;
};

async function getAuthSessionSource(): Promise<AuthSessionSource> {
  const [requestHeaders, requestCookies] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const cookieHeader = requestCookies
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return {
    authorizationHeader: requestHeaders.get("authorization") ?? undefined,
    cookieHeader: cookieHeader.length > 0 ? cookieHeader : undefined,
  };
}

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function emptyScheduleReadModel(
  role: EventScheduleRole,
  organizationIds: string[] = [],
): EventScheduleReadModel {
  return {
    canCreateEvents: false,
    events: [],
    organizationIds,
    role,
    source: "empty",
    teams: [],
  };
}

function isRoleSession(
  session: AuthSession | null,
  role: EventScheduleRole,
): session is AuthSession {
  if (!session || role === "shared") {
    return false;
  }

  if (role === "coach") {
    return session.claims.role === "coach";
  }

  return role === "parent"
    ? session.claims.role === "parent" && Boolean(getLiveParentId(session))
    : false;
}

function eventIsInOrganizationScope(
  event: GameDayEvent,
  organizationIds: string[],
) {
  return organizationIds.includes(event.organizationId);
}

function eventIsInTeamScope(event: GameDayEvent, teamIds: string[]) {
  return teamIds.some((teamId) => eventHasTeamId(event, teamId));
}

async function getVerifiedRoleSession(role: EventScheduleRole) {
  if (!getFirebaseAdminConfig() || role === "shared") {
    return null;
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider
    .verifySession(await getAuthSessionSource())
    .catch(() => null);

  if (!session) {
    return null;
  }

  if (role === "admin") {
    const adminScope = await resolveAdminOrganizationScope(session);
    return canAccessAdmin(adminScope) ? session : null;
  }

  return isRoleSession(session, role) ? session : null;
}

async function getTeamsByIds(teamIds: string[]) {
  const repositories = createFirestoreRepositories();
  const teams = await Promise.all(
    uniqueStrings(teamIds).map((teamId) => repositories.teams.getById(teamId)),
  );

  return teams.filter((team): team is Team => Boolean(team));
}

function getEventScopedTeamIds(events: GameDayEvent[]) {
  return uniqueStrings(events.flatMap(getEventTeamIds));
}

function sortScheduleEvents(events: GameDayEvent[]) {
  return uniqueById(events).sort(sortEventsByStartDate);
}

async function getAdminScheduleReadModel(
  session: AuthSession,
  activeOrganizationId?: string,
): Promise<EventScheduleReadModel> {
  const repositories = createFirestoreRepositories();
  const adminScope = await resolveAdminOrganizationScope(session);
  const organizationId = activeOrganizationId?.trim();

  if (!organizationId || !canManageOrganization(adminScope, organizationId)) {
    return emptyScheduleReadModel("admin");
  }

  const [teams, events] = await Promise.all([
    repositories.teams.listByOrganizationId(organizationId),
    repositories.events.listByOrganizationId(organizationId),
  ]);

  return {
    canCreateEvents: canUseAdminSetup(adminScope),
    events: sortScheduleEvents(
      events.filter((event) => event.organizationId === organizationId),
    ),
    organizationIds: [organizationId],
    role: "admin",
    source: "firestore",
    teams: uniqueById(teams),
  };
}

async function getCoachScheduleReadModel(
  session: AuthSession,
): Promise<EventScheduleReadModel> {
  const repositories = createFirestoreRepositories();
  const coachScope = await resolveCoachAssignmentScope(session);
  const organizationIds = coachScope.organizationIds;
  const teams = await getCoachAssignedTeams(coachScope);
  const teamIds = teams.map((team) => team.id);
  const eventLists = await Promise.all(
    teamIds.map((teamId) => repositories.events.listByTeamId(teamId)),
  );

  return {
    canCreateEvents: false,
    events: sortScheduleEvents(
      eventLists
        .flat()
        .filter(isEventVisibleToNonAdmin)
        .filter((event) => eventIsInOrganizationScope(event, organizationIds))
        .filter((event) => eventIsInTeamScope(event, teamIds)),
    ),
    organizationIds,
    role: "coach",
    source: "firestore",
    teams,
  };
}

function getOwnedParentRegistrations(
  registrations: Registration[],
  session: AuthSession,
  parentId: string,
) {
  return registrations.filter(
    (registration) =>
      registration.parentId === parentId &&
      isParentEventEligibleRegistration(registration) &&
      (registration.ownerUid === session.user.id ||
        registration.parentUid === session.user.id ||
        !registration.ownerUid),
  );
}

async function getParentScheduleReadModel(
  session: AuthSession,
): Promise<EventScheduleReadModel> {
  const parentId = getLiveParentId(session);

  if (!parentId) {
    return emptyScheduleReadModel("parent");
  }

  const repositories = createFirestoreRepositories();
  const registrations = getOwnedParentRegistrations(
    await repositories.registrations.listByParentId(parentId),
    session,
    parentId,
  );
  const teamIds = uniqueStrings(
    registrations.map((registration) => registration.teamId),
  );
  const organizationIds = uniqueStrings(
    registrations.map((registration) => registration.organizationId),
  );
  const [teams, eventLists] = await Promise.all([
    getTeamsByIds(teamIds),
    Promise.all(
      teamIds.map((teamId) => repositories.events.listByTeamId(teamId)),
    ),
  ]);

  return {
    canCreateEvents: false,
    events: sortScheduleEvents(
      eventLists
        .flat()
        .filter(isEventVisibleToNonAdmin)
        .filter((event) => eventIsInOrganizationScope(event, organizationIds))
        .filter((event) => eventIsInTeamScope(event, teamIds)),
    ),
    organizationIds,
    role: "parent",
    source: "firestore",
    teams,
  };
}

export async function getEventScheduleReadModel(
  role: EventScheduleRole,
  activeOrganizationId?: string,
): Promise<EventScheduleReadModel> {
  if (!getFirebaseAdminConfig()) {
    return emptyScheduleReadModel(role);
  }

  try {
    const session = await getVerifiedRoleSession(role);

    if (!session) {
      return emptyScheduleReadModel(role);
    }

    if (role === "admin") {
      return getAdminScheduleReadModel(session, activeOrganizationId);
    }

    if (role === "coach") {
      return getCoachScheduleReadModel(session);
    }

    if (role === "parent") {
      return getParentScheduleReadModel(session);
    }
  } catch (error) {
    console.warn("Could not load scoped schedule data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
      role,
    });
  }

  return emptyScheduleReadModel(role);
}

export async function getScopedEventDetailsReadModel(
  eventId: string,
  role: EventScheduleRole,
  activeOrganizationId?: string,
): Promise<ScopedEventDetailsReadModel | null> {
  const schedule = await getEventScheduleReadModel(role, activeOrganizationId);
  const event = schedule.events.find((scheduleEvent) => scheduleEvent.id === eventId);

  if (!event) {
    return null;
  }

  const teamIds = getEventScopedTeamIds([event]);
  const teamsById = new Map(schedule.teams.map((team) => [team.id, team]));
  const missingTeamIds = teamIds.filter((teamId) => !teamsById.has(teamId));
  const missingTeams = missingTeamIds.length > 0
    ? await getTeamsByIds(missingTeamIds)
    : [];

  return {
    ...schedule,
    event,
    teams: uniqueById([...schedule.teams, ...missingTeams]),
  };
}
