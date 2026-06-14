import { cookies, headers } from "next/headers";
import type { AuthSession, AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import type { AttendanceEntry } from "./attendance";
import {
  getCoachAssignedTeams,
  resolveCoachAssignmentScope,
  type CoachAssignmentScope,
} from "./coachAssignments.server";
import type { Coach } from "./coaches";
import {
  eventHasTeamId,
  sortEventsByStartDate,
  type GameDayEvent,
} from "./events";
import type { GameDayMessage } from "./messages";
import type { Registration } from "./registrations";
import type { Team } from "./teams";
import type { TransportationEntry } from "./transportation";

export type CoachHomeReadSource = "empty" | "firestore";

export type CoachHomeReadModel = {
  attendanceEntries: AttendanceEntry[];
  coach: Coach;
  coachMessages: GameDayMessage[];
  coachRosterRegistrations: Registration[];
  coachTeam?: Team;
  coachTeamRegistrations: Registration[];
  coachTeams: Team[];
  source: CoachHomeReadSource;
  todayEvent?: GameDayEvent;
  transportationEntries: TransportationEntry[];
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

function isValidCoachSession(
  session: AuthSession | null,
): session is AuthSession {
  return session?.claims.role === "coach";
}

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

async function getCoachMessages(
  teamIds: string[],
  organizationIds: string[],
) {
  const repositories = createFirestoreRepositories();
  const teamIdSet = new Set(teamIds);
  const [organizationMessageLists, teamMessageLists] = await Promise.all([
    Promise.all(
      organizationIds.map((organizationId) =>
        repositories.messages.listByAudience({ organizationId }),
      ),
    ),
    Promise.all(
      [...teamIdSet].map((teamId) => repositories.messages.listByTeamId(teamId)),
    ),
  ]);

  return uniqueById([...organizationMessageLists.flat(), ...teamMessageLists.flat()])
    .filter((message) => message.audience.includes("coach"))
    .filter((message) => !message.teamId || teamIdSet.has(message.teamId))
    .sort((first, second) => second.timestamp.localeCompare(first.timestamp));
}

function getEmptyCoachHomeReadModel(
  session?: AuthSession | null,
): CoachHomeReadModel {
  const coach = session ? getSessionCoachFallback(session) : {
    email: "",
    firstName: "Coach",
    id: "",
    lastName: "",
    name: "GameDay Coach",
    organizationId: "",
    phone: "",
    teamIds: [],
  };

  return {
    attendanceEntries: [],
    coach,
    coachMessages: [],
    coachRosterRegistrations: [],
    coachTeamRegistrations: [],
    coachTeams: [],
    source: "empty",
    transportationEntries: [],
  };
}

function getSessionCoachFallback(session: AuthSession): Coach {
  const displayName =
    session.user.displayName ?? session.user.email ?? "GameDay Coach";

  return {
    coachId: session.claims.coachId ?? session.user.id,
    email: session.user.email ?? "",
    firstName: displayName,
    id: session.claims.coachId ?? session.user.id,
    lastName: "",
    name: displayName,
    organizationId: session.claims.organizationIds[0] ?? "",
    organizationIds: session.claims.organizationIds,
    phone: "",
    role: "coach",
    status: "Active",
    teamIds: session.claims.teamIds,
    uid: session.user.id,
  };
}

function isEventInCoachScope(
  scope: CoachAssignmentScope,
  event: GameDayEvent | null | undefined,
) {
  return Boolean(
    event &&
      event.status !== "draft" &&
      scope.teamIds.some((teamId) => eventHasTeamId(event, teamId)) &&
      scope.organizationIds.includes(event.organizationId),
  );
}

async function getScopedCoachEvents(scope: CoachAssignmentScope) {
  const repositories = createFirestoreRepositories();
  const eventLists = await Promise.all(
    scope.teamIds.map((teamId) => repositories.events.listByTeamId(teamId)),
  );

  return uniqueById(
    eventLists.flat().filter((event) => isEventInCoachScope(scope, event)),
  ).sort(sortEventsByStartDate);
}

async function getScopedCoachEventsForTeams(
  scope: CoachAssignmentScope,
  teams: Team[],
) {
  const activeTeamIdSet = new Set(teams.map((team) => team.id));

  return getScopedCoachEvents({
    ...scope,
    teamIds: scope.teamIds.filter((teamId) => activeTeamIdSet.has(teamId)),
  });
}

async function getPrimaryCoachEvent(
  scope: CoachAssignmentScope,
  coachTeam: Team | undefined,
  coachEvents: GameDayEvent[],
): Promise<GameDayEvent | undefined> {
  const repositories = createFirestoreRepositories();
  const nextEvent = coachTeam?.nextEventId
    ? coachEvents.find((event) => event.id === coachTeam.nextEventId) ??
      (await repositories.events.getById(coachTeam.nextEventId))
    : undefined;

  return isEventInCoachScope(scope, nextEvent)
    ? (nextEvent ?? undefined)
    : coachEvents[0];
}

export async function getCoachHomeReadModel(): Promise<CoachHomeReadModel> {
  if (!getFirebaseAdminConfig()) {
    return getEmptyCoachHomeReadModel();
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession(await getAuthSessionSource());

    if (!isValidCoachSession(session)) {
      return getEmptyCoachHomeReadModel(session);
    }

    const repositories = createFirestoreRepositories();
    const coachScope = await resolveCoachAssignmentScope(session);
    const coachTeams = await getCoachAssignedTeams(coachScope);
    const coachEvents = await getScopedCoachEventsForTeams(
      coachScope,
      coachTeams,
    );
    const coach = coachScope.coach;
    const coachTeam = coachTeams[0];
    const todayEvent = await getPrimaryCoachEvent(
      coachScope,
      coachTeam,
      coachEvents,
    );
    const [
      coachMessages,
      coachRosterRegistrationLists,
      coachTeamRegistrations,
      attendanceEntries,
      transportationEntries,
    ] =
      await Promise.all([
        getCoachMessages(
          coachTeams.map((team) => team.id),
          coachScope.organizationIds,
        ),
        Promise.all(
          coachTeams.map((team) =>
            repositories.registrations.listRosteredByTeamId(team.id),
          ),
        ),
        coachTeam ? repositories.registrations.listRosteredByTeamId(coachTeam.id) : [],
        todayEvent ? repositories.attendance.listByEventId(todayEvent.id) : [],
        todayEvent
          ? repositories.transportation.listByEventId(todayEvent.id)
          : [],
      ]);

    return {
      attendanceEntries,
      coach,
      coachMessages,
      coachRosterRegistrations: uniqueById(coachRosterRegistrationLists.flat()),
      coachTeam,
      coachTeamRegistrations,
      coachTeams,
      source: "firestore",
      todayEvent,
      transportationEntries,
    };
  } catch (error) {
    console.warn("Could not load live coach data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return getEmptyCoachHomeReadModel();
  }
}
