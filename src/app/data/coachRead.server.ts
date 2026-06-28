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
  isEventVisibleToNonAdmin,
  isUpcomingEvent,
  sortEventsByStartDate,
  type GameDayEvent,
} from "./events";
import type { Organization } from "./organizations";
import type { ParentGuardian } from "./parents";
import type { Registration } from "./registrations";
import type { Team } from "./teams";
import type { TransportationEntry } from "./transportation";
import type { GameDayMessage } from "./messages";

export type CoachHomeReadSource = "empty" | "error" | "firestore";

export type CoachTeamHomeCard = {
  attendanceEntries: AttendanceEntry[];
  events: GameDayEvent[];
  nextEvent?: GameDayEvent;
  organization?: Organization;
  registrations: Registration[];
  rosterPlayers: CoachRosterPlayer[];
  teamMessages: GameDayMessage[];
  team: Team;
  transportationEntries: TransportationEntry[];
};

export type CoachRosterPlayer = {
  parent?: ParentGuardian;
  registration: Registration;
};

export type CoachHomeReadModel = {
  attendanceEntries: AttendanceEntry[];
  coach: Coach;
  coachMessages: GameDayMessage[];
  coachTeamCards: CoachTeamHomeCard[];
  coachRosterRegistrations: Registration[];
  coachTeam?: Team;
  coachTeamRegistrations: Registration[];
  coachTeams: Team[];
  errorMessage?: string;
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

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function getEmptyCoachHomeReadModel(
  session?: AuthSession | null,
  options: {
    errorMessage?: string;
    source?: CoachHomeReadSource;
  } = {},
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
    coachTeamCards: [],
    coachRosterRegistrations: [],
    coachTeamRegistrations: [],
    coachTeams: [],
    errorMessage: options.errorMessage,
    source: options.source ?? "empty",
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
      isEventVisibleToNonAdmin(event) &&
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

function getCoachTeamEvents(
  coachEvents: GameDayEvent[],
  team: Team,
  now = new Date(),
) {
  return coachEvents.filter(
    (event) =>
      event.organizationId === team.organizationId &&
      eventHasTeamId(event, team.id) &&
      isUpcomingEvent(event, now),
  );
}

function getPrimaryCoachTeamEvent(
  team: Team,
  teamEvents: GameDayEvent[],
): GameDayEvent | undefined {
  const pinnedEvent = team.nextEventId
    ? teamEvents.find((event) => event.id === team.nextEventId)
    : undefined;

  return pinnedEvent ?? teamEvents[0];
}

export async function getCoachHomeReadModel(): Promise<CoachHomeReadModel> {
  if (!getFirebaseAdminConfig()) {
    return getEmptyCoachHomeReadModel();
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession(await getAuthSessionSource());

    if (!session) {
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
    const organizationIds = uniqueById(
      coachTeams.map((team) => ({
        id: team.organizationId,
      })),
    ).map((organization) => organization.id);
    const organizations = await Promise.all(
      organizationIds.map((organizationId) =>
        repositories.organizations.getById(organizationId),
      ),
    );
    const organizationById = new Map(
      organizations.flatMap((organization) =>
        organization ? [[organization.id, organization]] : [],
      ),
    );
    const coachMessages = (
      await Promise.all(
        organizationIds.map((organizationId) =>
          repositories.messages.listByAudience({ organizationId }),
        ),
      )
    )
      .flat()
      .filter(
        (message) =>
          !message.teamId &&
          message.audience.includes("coach") &&
          organizationIds.includes(message.organizationId),
      )
      .sort((first, second) =>
        second.timestamp.localeCompare(first.timestamp),
      )
      .slice(0, 5);
    const coachTeamCards = await Promise.all(
      coachTeams.map(async (team) => {
        const teamEvents = getCoachTeamEvents(coachEvents, team);
        const nextEvent = getPrimaryCoachTeamEvent(team, teamEvents);
        const registrations =
          await repositories.registrations.listRosteredByTeamId(team.id);
        const parentIds = [
          ...new Set(
            registrations
              .map((registration) => registration.parentId)
              .filter(Boolean),
          ),
        ];
        const parentRecords = await Promise.all(
          parentIds.map((parentId) => repositories.parents.getById(parentId)),
        );
        const parentById = new Map(
          parentRecords.flatMap((parent) =>
            parent ? [[parent.id, parent]] : [],
          ),
        );
        const rosterPlayers = registrations.map((registration) => ({
          parent: parentById.get(registration.parentId),
          registration,
        }));
        const rosteredAthleteIdSet = new Set(
          registrations.map((registration) => registration.athleteId),
        );
        const [attendanceEntries, transportationEntries] = nextEvent
          ? await Promise.all([
              repositories.attendance
                .listByEventId(nextEvent.id)
                .then((entries) =>
                  entries.filter(
                    (entry) =>
                      entry.athleteId &&
                      rosteredAthleteIdSet.has(entry.athleteId),
                  ),
                ),
              repositories.transportation
                .listByEventId(nextEvent.id)
                .then((entries) =>
                  entries.filter(
                    (entry) =>
                      entry.athleteId &&
                      rosteredAthleteIdSet.has(entry.athleteId),
                  ),
                ),
            ])
          : [[], []];
        const coachSenderIds = [
          coach.uid,
          coach.id,
          session.user.id,
        ].filter(Boolean);
        const teamMessages = (
          await repositories.messages.listByTeamId(team.id)
        )
          .filter(
            (message) =>
              message.organizationId === team.organizationId &&
              message.type === "Team Announcement" &&
              (message.audience.includes("coach") ||
                coachSenderIds.includes(message.senderId)),
          )
          .sort((first, second) =>
            second.timestamp.localeCompare(first.timestamp),
          )
          .slice(0, 5);

        return {
          attendanceEntries,
          events: teamEvents,
          nextEvent,
          organization: organizationById.get(team.organizationId),
          registrations,
          rosterPlayers,
          teamMessages,
          team,
          transportationEntries,
        };
      }),
    );
    const coachTeam = coachTeamCards[0]?.team;
    const todayEvent = coachTeamCards[0]?.nextEvent;
    const coachRosterRegistrations = uniqueById(
      coachTeamCards.flatMap((card) => card.registrations),
    );
    const coachTeamRegistrations = coachTeamCards[0]?.registrations ?? [];
    const attendanceEntries = coachTeamCards.flatMap(
      (card) => card.attendanceEntries,
    );
    const transportationEntries = coachTeamCards.flatMap(
      (card) => card.transportationEntries,
    );

    return {
      attendanceEntries,
      coach,
      coachMessages,
      coachTeamCards,
      coachRosterRegistrations,
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

    return getEmptyCoachHomeReadModel(null, {
      errorMessage: "Could not load coach dashboard data. Please try again.",
      source: "error",
    });
  }
}
