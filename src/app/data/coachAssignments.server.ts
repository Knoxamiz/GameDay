import type { AuthSession } from "../infrastructure/auth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  isActiveCoachAssignment,
  type CoachAssignment,
} from "./coachAssignmentRecords";
import {
  getCoachOrganizationIds,
  isActiveCoach,
  type Coach,
} from "./coaches";
import { isActiveTeam, type Team } from "./teams";

export type CoachAssignmentScopeSource =
  | "assignments"
  | "claims"
  | "empty"
  | "legacy-coach";

export type CoachAssignmentScope = {
  coach: Coach;
  organizationIds: string[];
  source: CoachAssignmentScopeSource;
  teamIds: string[];
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function uniqueStringList(values: (string | undefined)[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function getSingleAssignmentCoachId(
  assignments: CoachAssignment[],
  identityType: "email" | "uid",
) {
  const coachIds = uniqueStringList(
    assignments.map((assignment) => assignment.coachId),
  );

  if (coachIds.length > 1) {
    throw new Error(
      `Coach assignment ${identityType} is linked to multiple coach profiles.`,
    );
  }

  return coachIds[0] ?? "";
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

function getEmptyCoachScope(session?: AuthSession | null): CoachAssignmentScope {
  const coach = session
    ? {
        ...getSessionCoachFallback(session),
        status: "Inactive" as const,
        teamIds: [],
      }
    : {
        email: "",
        firstName: "Coach",
        id: "",
        lastName: "",
        name: "GameDay Coach",
        organizationId: "",
        organizationIds: [],
        phone: "",
        role: "coach" as const,
        status: "Inactive" as const,
        teamIds: [],
      };

  return {
    coach,
    organizationIds: [],
    source: "empty",
    teamIds: [],
  };
}

async function findFirestoreCoachForSession(session: AuthSession) {
  const repositories = createFirestoreRepositories();
  const coachId = normalizeText(session.claims.coachId);
  const email = normalizeEmail(session.user.email);
  const uid = normalizeText(session.user.id);
  const candidates = await Promise.all([
    coachId ? repositories.coaches.getById(coachId) : null,
    uid ? repositories.coaches.getByUid(uid) : null,
    email ? repositories.coaches.getByEmail(email) : null,
  ]);

  return candidates.find((coach): coach is Coach => Boolean(coach)) ?? null;
}

async function findAssignmentsForSession(session: AuthSession) {
  const repositories = createFirestoreRepositories();
  const coachId = normalizeText(session.claims.coachId);
  const email = normalizeEmail(session.user.email);
  const uid = normalizeText(session.user.id);
  const [uidAssignments, coachIdAssignments, emailAssignments] =
    await Promise.all([
      uid ? repositories.coachAssignments.listByUid(uid) : [],
      coachId ? repositories.coachAssignments.listByCoachId(coachId) : [],
      email ? repositories.coachAssignments.listByEmail(email) : [],
    ]);

  if (uidAssignments.length > 0) {
    const assignmentCoachId = getSingleAssignmentCoachId(
      uidAssignments,
      "uid",
    );
    const allCoachAssignments = assignmentCoachId
      ? await repositories.coachAssignments.listByCoachId(assignmentCoachId)
      : [];

    return uniqueById([...uidAssignments, ...allCoachAssignments]);
  }

  if (coachIdAssignments.length > 0) {
    return uniqueById(coachIdAssignments);
  }

  if (emailAssignments.length > 0) {
    const assignmentCoachId = getSingleAssignmentCoachId(
      emailAssignments,
      "email",
    );
    const allCoachAssignments = assignmentCoachId
      ? await repositories.coachAssignments.listByCoachId(assignmentCoachId)
      : [];

    return uniqueById([...emailAssignments, ...allCoachAssignments]);
  }

  return [];
}

async function getAssignmentCoachProfile(
  session: AuthSession,
  assignments: CoachAssignment[],
) {
  const repositories = createFirestoreRepositories();
  const firstAssignment = assignments[0];
  const firestoreCoach = firstAssignment
    ? await repositories.coaches.getById(firstAssignment.coachId)
    : null;
  const fallbackCoach = getSessionCoachFallback(session);
  const activeAssignments = assignments.filter(isActiveCoachAssignment);
  const organizationIds = uniqueStringList(
    activeAssignments.map((assignment) => assignment.organizationId),
  );
  const teamIds = uniqueStringList(
    activeAssignments.flatMap((assignment) => assignment.teamIds),
  );

  return {
    ...(firestoreCoach ?? fallbackCoach),
    coachId:
      firestoreCoach?.coachId ?? firstAssignment?.coachId ?? fallbackCoach.id,
    email:
      firestoreCoach?.email ?? firstAssignment?.email ?? fallbackCoach.email,
    id: firestoreCoach?.id ?? firstAssignment?.coachId ?? fallbackCoach.id,
    organizationId: organizationIds[0] ?? "",
    organizationIds,
    role: "coach" as const,
    status:
      activeAssignments.length > 0
        ? ("Active" as const)
        : ("Inactive" as const),
    teamIds,
    uid: firestoreCoach?.uid ?? firstAssignment?.uid ?? session.user.id,
  } satisfies Coach;
}

export async function resolveCoachAssignmentScope(
  session: AuthSession | null,
): Promise<CoachAssignmentScope> {
  if (session?.claims.role !== "coach") {
    return getEmptyCoachScope(session);
  }

  const assignments = await findAssignmentsForSession(session);

  if (assignments.length > 0) {
    const activeAssignments = assignments.filter(isActiveCoachAssignment);
    const coach = await getAssignmentCoachProfile(session, assignments);

    return {
      coach,
      organizationIds: uniqueStringList(
        activeAssignments.map((assignment) => assignment.organizationId),
      ),
      source: "assignments",
      teamIds: uniqueStringList(
        activeAssignments.flatMap((assignment) => assignment.teamIds),
      ),
    };
  }

  const firestoreCoach = await findFirestoreCoachForSession(session);

  if (firestoreCoach) {
    const organizationIds = getCoachOrganizationIds(firestoreCoach);

    return {
      coach: firestoreCoach,
      organizationIds,
      source: "legacy-coach",
      teamIds: isActiveCoach(firestoreCoach)
        ? uniqueStringList(firestoreCoach.teamIds ?? [])
        : [],
    };
  }

  const fallbackCoach = getSessionCoachFallback(session);

  return {
    coach: fallbackCoach,
    organizationIds: uniqueStringList(session.claims.organizationIds),
    source: "claims",
    teamIds: uniqueStringList(session.claims.teamIds),
  };
}

export async function getCoachAssignedTeams(scope: CoachAssignmentScope) {
  if (scope.teamIds.length === 0 || scope.organizationIds.length === 0) {
    return [];
  }

  const repositories = createFirestoreRepositories();
  const teams = await Promise.all(
    scope.teamIds.map((teamId) => repositories.teams.getById(teamId)),
  );

  return uniqueById(
    teams.filter(
      (team): team is Team =>
        Boolean(
          team &&
            scope.organizationIds.includes(team.organizationId) &&
            isActiveTeam(team),
        ),
    ),
  );
}
