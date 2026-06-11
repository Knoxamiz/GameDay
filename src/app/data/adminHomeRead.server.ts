import { cookies, headers } from "next/headers";
import type { AuthSession, AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import type { AttendanceEntry } from "./attendance";
import type { Coach } from "./coaches";
import type { GameDayEvent } from "./events";
import type { GameDayMessage } from "./messages";
import type { Organization } from "./organizations";
import type { Registration } from "./registrations";
import type { Team } from "./teams";
import type { TransportationEntry } from "./transportation";

export type AdminHomeReadModel = {
  attendanceEntries: AttendanceEntry[];
  communications: GameDayMessage[];
  coaches: Coach[];
  events: GameDayEvent[];
  organization: Organization;
  organizations: Organization[];
  registrations: Registration[];
  source: "empty" | "firestore";
  teams: Team[];
  transportationEntries: TransportationEntry[];
};

const emptyOrganizationStatus = {
  activeTeams: 0,
  coaches: 0,
  registeredPlayers: 0,
  upcomingEvents: 0,
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

function getOrganizationShell(organizationId?: string): Organization {
  const id = organizationId || "organization";
  const name = id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

  return {
    id,
    name: name || "Organization",
    organizationId: id,
    status: emptyOrganizationStatus,
  };
}

function isValidAdminSession(
  session: AuthSession | null,
): session is AuthSession {
  return Boolean(
    session?.claims.role === "admin" &&
      session.claims.adminId &&
      session.claims.organizationIds.length > 0,
  );
}

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function buildEmptyAdminHomeReadModel(
  organizationId?: string,
): AdminHomeReadModel {
  return {
    attendanceEntries: [],
    communications: [],
    coaches: [],
    events: [],
    organization: getOrganizationShell(organizationId),
    organizations: organizationId ? [getOrganizationShell(organizationId)] : [],
    registrations: [],
    source: "empty",
    teams: [],
    transportationEntries: [],
  };
}

export async function getAdminHomeReadModel(): Promise<AdminHomeReadModel> {
  if (!getFirebaseAdminConfig()) {
    return buildEmptyAdminHomeReadModel();
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession(await getAuthSessionSource());

    if (!isValidAdminSession(session)) {
      return buildEmptyAdminHomeReadModel();
    }

    const repositories = createFirestoreRepositories();
    const organizationIds = session.claims.organizationIds;
    const [
      organizations,
      teamLists,
      coachLists,
      eventLists,
      registrationLists,
      communicationLists,
    ] = await Promise.all([
      Promise.all(
        organizationIds.map((organizationId) =>
          repositories.organizations.getById(organizationId),
        ),
      ),
      Promise.all(
        organizationIds.map((organizationId) =>
          repositories.teams.listByOrganizationId(organizationId),
        ),
      ),
      Promise.all(
        organizationIds.map((organizationId) =>
          repositories.coaches.listByOrganizationId(organizationId),
        ),
      ),
      Promise.all(
        organizationIds.map((organizationId) =>
          repositories.events.listByOrganizationId(organizationId),
        ),
      ),
      Promise.all(
        organizationIds.map((organizationId) =>
          repositories.registrations.listByOrganizationId(organizationId),
        ),
      ),
      Promise.all(
        organizationIds.map((organizationId) =>
          repositories.messages.listByAudience({ organizationId }),
        ),
      ),
    ]);
    const events = uniqueById(eventLists.flat());
    const [attendanceLists, transportationLists] = await Promise.all([
      Promise.all(
        events.map((event) => repositories.attendance.listByEventId(event.id)),
      ),
      Promise.all(
        events.map((event) =>
          repositories.transportation.listByEventId(event.id),
        ),
      ),
    ]);

    const organizationRecords = organizations.filter(
      (organization): organization is Organization => Boolean(organization),
    );

    return {
      attendanceEntries: uniqueById(attendanceLists.flat()),
      communications: uniqueById(communicationLists.flat()),
      coaches: uniqueById(coachLists.flat()),
      events,
      organization:
        organizationRecords[0] ?? getOrganizationShell(organizationIds[0]),
      organizations: organizationRecords,
      registrations: uniqueById(registrationLists.flat()),
      source: "firestore",
      teams: uniqueById(teamLists.flat()),
      transportationEntries: uniqueById(transportationLists.flat()),
    };
  } catch (error) {
    console.warn("Could not load live admin home data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return buildEmptyAdminHomeReadModel();
  }
}
