import { cookies, headers } from "next/headers";
import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  canManageOrganization,
  resolveAdminOrganizationScope,
  verifyAdminAccessSession,
} from "./adminOrganizationScope.server";
import type { AttendanceEntry } from "./attendance";
import { isActiveCoachAssignment } from "./coachAssignmentRecords";
import type { Coach } from "./coaches";
import type { GameDayEvent } from "./events";
import type { GameDayMessage } from "./messages";
import type { Organization } from "./organizations";
import type { Registration } from "./registrations";
import { isArchivedTeam, type Team } from "./teams";
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

export async function getAdminHomeReadModel(
  activeOrganizationId?: string,
): Promise<AdminHomeReadModel> {
  if (!getFirebaseAdminConfig()) {
    return buildEmptyAdminHomeReadModel();
  }

  try {
    const session = await verifyAdminAccessSession(await getAuthSessionSource());

    if (!session) {
      return buildEmptyAdminHomeReadModel();
    }

    const repositories = createFirestoreRepositories();
    const scope = await resolveAdminOrganizationScope(session);
    const organizationId = activeOrganizationId?.trim();

    if (!organizationId || !canManageOrganization(scope, organizationId)) {
      return buildEmptyAdminHomeReadModel();
    }

    const [
      organization,
      teams,
      coachAssignments,
      events,
      registrations,
      communications,
    ] = await Promise.all([
      repositories.organizations.getById(organizationId),
      repositories.teams.listByOrganizationId(organizationId),
      repositories.coachAssignments.listByOrganizationId(organizationId),
      repositories.events.listByOrganizationId(organizationId),
      repositories.registrations.listByOrganizationId(organizationId),
      repositories.messages.listByAudience({ organizationId }),
    ]);
    const coaches = (
      await Promise.all(
        uniqueById(
          coachAssignments.filter(isActiveCoachAssignment),
        ).map((assignment) => repositories.coaches.getById(assignment.coachId)),
      )
    ).filter((coach): coach is Coach => Boolean(coach));
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

    return {
      attendanceEntries: uniqueById(attendanceLists.flat()),
      communications: uniqueById(communications),
      coaches: uniqueById(coaches),
      events,
      organization: organization ?? getOrganizationShell(organizationId),
      organizations: [organization ?? getOrganizationShell(organizationId)],
      registrations: uniqueById(registrations),
      source: "firestore",
      teams: uniqueById(teams).filter((team) => !isArchivedTeam(team)),
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
