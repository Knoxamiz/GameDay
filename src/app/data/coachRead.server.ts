import { cookies, headers } from "next/headers";
import type { AuthSession, AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  getAttendanceEntriesByEventId,
  type AttendanceEntry,
} from "./attendance";
import { getCurrentCoach, type Coach } from "./coaches";
import { getEventById, type GameDayEvent } from "./events";
import { getMessagesByAudience, type GameDayMessage } from "./messages";
import { type Registration, getRegistrationsByTeamId } from "./registrations";
import { getTeamsByCoachId, type Team } from "./teams";
import {
  getTransportationEntriesByEventId,
  type TransportationEntry,
} from "./transportation";

export type CoachHomeReadSource = "firestore" | "mock";

export type CoachHomeReadModel = {
  attendanceEntries: AttendanceEntry[];
  coach: Coach;
  coachMessages: GameDayMessage[];
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
  return Boolean(
    session?.claims.role === "coach" &&
      session.claims.coachId &&
      session.claims.organizationIds.length > 0 &&
      session.claims.teamIds.length > 0,
  );
}

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function getCoachMessages(coach: Coach, teamIds: string[]) {
  const teamIdSet = new Set(teamIds.length > 0 ? teamIds : coach.teamIds);

  return getMessagesByAudience("coach", coach.organizationId).filter(
    (message) => !message.teamId || teamIdSet.has(message.teamId),
  );
}

function getMockCoachHomeReadModel(): CoachHomeReadModel {
  const coach = getCurrentCoach();
  const coachTeams = getTeamsByCoachId(coach.id);
  const coachTeam = coachTeams[0];
  const todayEvent = coachTeam?.nextEventId
    ? getEventById(coachTeam.nextEventId)
    : undefined;
  const coachTeamRegistrations = coachTeam
    ? getRegistrationsByTeamId(coachTeam.id)
    : [];

  return {
    attendanceEntries: todayEvent
      ? getAttendanceEntriesByEventId(todayEvent.id)
      : [],
    coach,
    coachMessages: getCoachMessages(
      coach,
      coachTeams.map((team) => team.id),
    ),
    coachTeam,
    coachTeamRegistrations,
    coachTeams,
    source: "mock",
    todayEvent,
    transportationEntries: todayEvent
      ? getTransportationEntriesByEventId(todayEvent.id)
      : [],
  };
}

function getSessionCoachFallback(session: AuthSession): Coach {
  const displayName =
    session.user.displayName ?? session.user.email ?? "GameDay Coach";

  return {
    email: session.user.email ?? "",
    firstName: displayName,
    id: session.claims.coachId ?? session.user.id,
    lastName: "",
    name: displayName,
    organizationId: session.claims.organizationIds[0] ?? "",
    phone: "",
    teamIds: session.claims.teamIds,
  };
}

function isTeamInCoachScope(session: AuthSession, team: Team | null) {
  return Boolean(
    team &&
      session.claims.teamIds.includes(team.id) &&
      session.claims.organizationIds.includes(team.organizationId),
  );
}

function isEventInCoachScope(
  session: AuthSession,
  event: GameDayEvent | null | undefined,
) {
  return Boolean(
    event &&
      event.teamId &&
      session.claims.teamIds.includes(event.teamId) &&
      session.claims.organizationIds.includes(event.organizationId),
  );
}

async function getScopedCoachTeams(session: AuthSession) {
  const repositories = createFirestoreRepositories();
  const teamsByClaim = await Promise.all(
    session.claims.teamIds.map((teamId) => repositories.teams.getById(teamId)),
  );
  const claimedTeams = teamsByClaim.filter((team): team is Team =>
    isTeamInCoachScope(session, team),
  );

  if (claimedTeams.length > 0) {
    return uniqueById(claimedTeams);
  }

  const teamsByCoach = await repositories.teams.listByCoachId(
    session.claims.coachId ?? "",
  );

  return uniqueById(
    teamsByCoach.filter((team) => isTeamInCoachScope(session, team)),
  );
}

async function getScopedCoachEvents(session: AuthSession) {
  const repositories = createFirestoreRepositories();
  const eventLists = await Promise.all(
    session.claims.teamIds.map((teamId) => repositories.events.listByTeamId(teamId)),
  );

  return uniqueById(
    eventLists.flat().filter((event) => isEventInCoachScope(session, event)),
  );
}

async function getPrimaryCoachEvent(
  session: AuthSession,
  coachTeam: Team | undefined,
  coachEvents: GameDayEvent[],
): Promise<GameDayEvent | undefined> {
  const repositories = createFirestoreRepositories();
  const nextEvent = coachTeam?.nextEventId
    ? coachEvents.find((event) => event.id === coachTeam.nextEventId) ??
      (await repositories.events.getById(coachTeam.nextEventId))
    : undefined;

  return isEventInCoachScope(session, nextEvent)
    ? (nextEvent ?? undefined)
    : coachEvents[0];
}

export async function getCoachHomeReadModel(): Promise<CoachHomeReadModel> {
  if (!getFirebaseAdminConfig()) {
    return getMockCoachHomeReadModel();
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession(await getAuthSessionSource());

    if (!isValidCoachSession(session)) {
      return getMockCoachHomeReadModel();
    }

    const coachId = session.claims.coachId;

    if (!coachId) {
      return getMockCoachHomeReadModel();
    }

    const repositories = createFirestoreRepositories();
    const [coachRecord, coachTeams, coachEvents] = await Promise.all([
      repositories.coaches.getById(coachId),
      getScopedCoachTeams(session),
      getScopedCoachEvents(session),
    ]);
    const coach = coachRecord ?? getSessionCoachFallback(session);
    const coachTeam = coachTeams[0];
    const todayEvent = await getPrimaryCoachEvent(
      session,
      coachTeam,
      coachEvents,
    );
    const [coachTeamRegistrations, attendanceEntries, transportationEntries] =
      await Promise.all([
        coachTeam ? repositories.registrations.listByTeamId(coachTeam.id) : [],
        todayEvent ? repositories.attendance.listByEventId(todayEvent.id) : [],
        todayEvent
          ? repositories.transportation.listByEventId(todayEvent.id)
          : [],
      ]);

    return {
      attendanceEntries,
      coach,
      coachMessages: getCoachMessages(
        coach,
        coachTeams.map((team) => team.id),
      ),
      coachTeam,
      coachTeamRegistrations,
      coachTeams,
      source: "firestore",
      todayEvent,
      transportationEntries,
    };
  } catch (error) {
    console.warn("Falling back to mock coach data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return getMockCoachHomeReadModel();
  }
}
