import { cookies, headers } from "next/headers";
import {
  hasCapability,
  type AuthSession,
  type AuthSessionSource,
} from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { isActiveCoach, type Coach, type CoachAssignmentStatus } from "./coaches";
import { documentRequirementTemplates } from "./documents";
import type { RegistrationInvite } from "./invites";
import { createLiveRecordId, slugifyIdentityPart } from "./liveIdentity";
import type { Organization } from "./organizations";
import { paymentRequirementTemplates } from "./payments";
import { isCoachVisibleRosterRegistration, type Registration } from "./registrations";
import type { Team } from "./teams";

export type AdminSetupReadModel = {
  canManageSetup: boolean;
  coaches: Coach[];
  organizationIds: string[];
  organizations: Organization[];
  registrationInvites: RegistrationInvite[];
  source: "empty" | "firestore";
  teams: Team[];
};

export type AdminSetupPayload =
  | {
      actionType: "organization";
      name: string;
      organizationId: string;
    }
  | {
      actionType: "team";
      division: string;
      name: string;
      organizationId: string;
      season: string;
      status: "Active" | "Inactive";
    }
  | {
      actionType: "coach-assignment";
      email: string;
      name: string;
      organizationId: string;
      status: CoachAssignmentStatus;
      teamIds: string[];
      uid?: string;
    }
  | {
      actionType: "registration-invite";
      includePayment: boolean;
      organizationId: string;
      status: "Active" | "Paused";
      teamId: string;
      title: string;
    };

export type AdminSetupResult = {
  id: string;
  message: string;
  source: "firestore";
};

type AdminSetupWriteOptions = {
  sessionSource: AuthSessionSource;
};

export class AdminSetupError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AdminSetupError";
  }
}

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

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueStringList(values: (string | undefined)[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function hasSameMembers(first: string[], second: string[]) {
  const firstSet = new Set(first);
  const secondSet = new Set(second);

  return (
    firstSet.size === secondSet.size &&
    [...firstSet].every((value) => secondSet.has(value))
  );
}

function emptyReadModel(
  organizationIds: string[] = [],
): AdminSetupReadModel {
  return {
    canManageSetup: false,
    coaches: [],
    organizationIds,
    organizations: [],
    registrationInvites: [],
    source: "empty",
    teams: [],
  };
}

function createSetupError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new AdminSetupError(reason, message, status);
}

function isAdminSetupSession(
  session: AuthSession | null,
): session is AuthSession {
  return Boolean(
    session?.claims.role === "admin" &&
      session.claims.adminId &&
      session.claims.organizationIds.length > 0,
  );
}

async function requireAdminSetupSession(source: AuthSessionSource) {
  if (!getFirebaseAdminConfig()) {
    createSetupError(
      "firebase-unavailable",
      "Setup is not available until Firebase is configured.",
      503,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(source).catch(() => null);

  if (!isAdminSetupSession(session)) {
    createSetupError(
      "admin-session-required",
      "Please sign in as an admin before managing setup.",
      403,
    );
  }

  if (!hasCapability(session.claims, "manage-organization")) {
    createSetupError(
      "admin-setup-capability-required",
      "This admin cannot manage organization setup.",
      403,
    );
  }

  return session;
}

function assertClaimedOrganization(session: AuthSession, organizationId: string) {
  if (!session.claims.organizationIds.includes(organizationId)) {
    createSetupError(
      "admin-organization-access-required",
      "This admin cannot manage that organization.",
      403,
    );
  }
}

function getOrganizationStatus({
  coaches,
  events,
  registrations,
  teams,
}: {
  coaches: Coach[];
  events: number;
  registrations: Registration[];
  teams: Team[];
}) {
  return {
    activeTeams: teams.filter((team) => team.lifecycleStatus !== "Inactive")
      .length,
    coaches: coaches.filter(isActiveCoach).length,
    registeredPlayers: registrations.filter(isCoachVisibleRosterRegistration)
      .length,
    upcomingEvents: events,
  };
}

function getRecordActor(session: AuthSession) {
  return {
    athleteIds: session.claims.athleteIds,
    id: session.claims.adminId ?? session.user.id,
    organizationIds: session.claims.organizationIds,
    role: session.claims.role,
    teamIds: session.claims.teamIds,
  };
}

export async function getAdminSetupReadModel(): Promise<AdminSetupReadModel> {
  if (!getFirebaseAdminConfig()) {
    return emptyReadModel();
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession(await getAuthSessionSource());

    if (!isAdminSetupSession(session)) {
      return emptyReadModel();
    }

    const repositories = createFirestoreRepositories();
    const organizationIds = session.claims.organizationIds;
    const [organizations, teamLists, coachLists, inviteList] = await Promise.all([
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
      repositories.registrationInvites.list(),
    ]);
    const organizationSet = new Set(organizationIds);

    return {
      canManageSetup: true,
      coaches: uniqueById(coachLists.flat()),
      organizationIds,
      organizations: organizations.filter(
        (organization): organization is Organization => Boolean(organization),
      ),
      registrationInvites: inviteList.filter((invite) =>
        organizationSet.has(invite.organizationId),
      ),
      source: "firestore",
      teams: uniqueById(teamLists.flat()),
    };
  } catch (error) {
    console.warn("Could not load admin setup data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return emptyReadModel();
  }
}

async function createOrUpdateOrganization(
  session: AuthSession,
  payload: Extract<AdminSetupPayload, { actionType: "organization" }>,
): Promise<AdminSetupResult> {
  const organizationId = normalizeText(payload.organizationId);
  const name = normalizeText(payload.name);

  if (!organizationId || !name) {
    createSetupError(
      "invalid-organization",
      "Organization ID and name are required.",
      400,
    );
  }

  assertClaimedOrganization(session, organizationId);

  const repositories = createFirestoreRepositories();
  const [currentOrganization, teams, coaches, events, registrations] = await Promise.all([
    repositories.organizations.getById(organizationId),
    repositories.teams.listByOrganizationId(organizationId),
    repositories.coaches.listByOrganizationId(organizationId),
    repositories.events.listByOrganizationId(organizationId),
    repositories.registrations.listByOrganizationId(organizationId),
  ]);
  const now = new Date().toISOString();
  const organization: Organization = {
    adminIds: uniqueStringList([
      ...(currentOrganization?.adminIds ?? []),
      session.claims.adminId,
    ]),
    createdAt: currentOrganization?.createdAt ?? now,
    createdByUid: currentOrganization?.createdByUid ?? session.user.id,
    id: organizationId,
    name,
    ownerUid: currentOrganization?.ownerUid ?? session.user.id,
    status: getOrganizationStatus({
      coaches,
      events: events.length,
      registrations,
      teams,
    }),
    updatedAt: now,
  };
  const actor = getRecordActor(session);

  if (currentOrganization) {
    await repositories.organizations.update(organizationId, organization, {
      actor,
      reason: "Admin updated organization setup.",
    });
  } else {
    await repositories.organizations.create(organization, {
      actor,
      reason: "Admin created organization setup.",
    });
  }

  return {
    id: organization.id,
    message: `Organization saved: ${organization.name}`,
    source: "firestore",
  };
}

async function createTeam(
  session: AuthSession,
  payload: Extract<AdminSetupPayload, { actionType: "team" }>,
): Promise<AdminSetupResult> {
  const organizationId = normalizeText(payload.organizationId);
  const name = normalizeText(payload.name);
  const division = normalizeText(payload.division);
  const season = normalizeText(payload.season);
  const lifecycleStatus = payload.status === "Inactive" ? "Inactive" : "Active";

  if (!organizationId || !name || !division || !season) {
    createSetupError(
      "invalid-team",
      "Organization, team name, division, and season are required.",
      400,
    );
  }

  assertClaimedOrganization(session, organizationId);

  const repositories = createFirestoreRepositories();
  const organization = await repositories.organizations.getById(organizationId);

  if (!organization) {
    createSetupError(
      "organization-required",
      "Create the organization before creating teams.",
      400,
    );
  }

  const now = new Date().toISOString();
  const team: Team = {
    ageGroup: division,
    athleteIds: [],
    coachIds: [],
    createdAt: now,
    createdByUid: session.user.id,
    division,
    eventIds: [],
    id: createLiveRecordId("team", [organizationId, name, season]),
    label: division,
    lifecycleStatus,
    name,
    organizationId,
    playerCount: 0,
    rosterPreviewIds: [],
    season,
    status: [lifecycleStatus],
    updatedAt: now,
  };

  await repositories.teams.create(team, {
    actor: getRecordActor(session),
    reason: "Admin created team setup.",
  });

  return {
    id: team.id,
    message: `Team created: ${team.name}`,
    source: "firestore",
  };
}

function getNameParts(name: string) {
  const [firstName = name, ...lastNameParts] = name.split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

function getCoachIdFromEmail(email: string) {
  return `coach-${slugifyIdentityPart(email)}`;
}

async function updateTeamCoachHelpers({
  assignedTeamIds,
  coachId,
  organizationId,
  session,
  status,
  updatedAt,
}: {
  assignedTeamIds: string[];
  coachId: string;
  organizationId: string;
  session: AuthSession;
  status: CoachAssignmentStatus;
  updatedAt: string;
}) {
  const repositories = createFirestoreRepositories();
  const activeAssignedTeamIds = new Set(
    status === "Active" ? assignedTeamIds : [],
  );
  const organizationTeams =
    await repositories.teams.listByOrganizationId(organizationId);

  await Promise.all(
    organizationTeams.map(async (team) => {
      const currentCoachIds = Array.isArray(team.coachIds) ? team.coachIds : [];
      const nextCoachIds = uniqueStringList([
        ...currentCoachIds.filter((teamCoachId) => teamCoachId !== coachId),
        activeAssignedTeamIds.has(team.id) ? coachId : undefined,
      ]);

      if (hasSameMembers(currentCoachIds, nextCoachIds)) {
        return;
      }

      await repositories.teams.update(
        team.id,
        {
          coachIds: nextCoachIds,
          updatedAt,
        },
        {
          actor: getRecordActor(session),
          reason: "Admin updated coach assignment helper fields.",
        },
      );
    }),
  );
}

async function createOrUpdateCoachAssignment(
  session: AuthSession,
  payload: Extract<AdminSetupPayload, { actionType: "coach-assignment" }>,
): Promise<AdminSetupResult> {
  const organizationId = normalizeText(payload.organizationId);
  const email = normalizeText(payload.email).toLowerCase();
  const name = normalizeText(payload.name);
  const uid = normalizeText(payload.uid);
  const status = payload.status === "Inactive" ? "Inactive" : "Active";
  const teamIds = uniqueStringList(payload.teamIds);

  if (!organizationId || !email || !name || teamIds.length === 0) {
    createSetupError(
      "invalid-coach-assignment",
      "Organization, coach name, email, and at least one team are required.",
      400,
    );
  }

  assertClaimedOrganization(session, organizationId);

  const repositories = createFirestoreRepositories();
  const [organization, currentCoachByEmail, teams] = await Promise.all([
    repositories.organizations.getById(organizationId),
    repositories.coaches.getByEmail(email),
    Promise.all(teamIds.map((teamId) => repositories.teams.getById(teamId))),
  ]);

  if (!organization) {
    createSetupError(
      "organization-required",
      "Create the organization before assigning coaches.",
      400,
    );
  }

  const validTeams = teams.filter((team): team is Team => Boolean(team));

  if (
    validTeams.length !== teamIds.length ||
    validTeams.some((team) => team.organizationId !== organizationId)
  ) {
    createSetupError(
      "coach-team-scope-invalid",
      "Coaches can only be assigned to teams inside this organization.",
      403,
    );
  }

  const generatedCoachId = getCoachIdFromEmail(email);
  const currentCoach =
    currentCoachByEmail ?? (await repositories.coaches.getById(generatedCoachId));
  const coachId = currentCoach?.id ?? generatedCoachId;
  const currentCoachTeams = currentCoach?.teamIds.length
    ? await Promise.all(
        currentCoach.teamIds.map((teamId) => repositories.teams.getById(teamId)),
      )
    : [];
  const otherOrganizationTeamIds = currentCoachTeams
    .filter(
      (team): team is Team =>
        Boolean(team && team.organizationId !== organizationId),
    )
    .map((team) => team.id);
  const organizationIds = uniqueStringList([
    ...(currentCoach?.organizationIds ?? []),
    currentCoach?.organizationId,
    organizationId,
  ]);
  const coachTeamIds = uniqueStringList([
    ...otherOrganizationTeamIds,
    ...(status === "Active" ? teamIds : []),
  ]);
  const { firstName, lastName } = getNameParts(name);
  const now = new Date().toISOString();
  const coach: Coach = {
    coachId: currentCoach?.coachId ?? coachId,
    createdAt: currentCoach?.createdAt ?? now,
    createdByUid: currentCoach?.createdByUid ?? session.user.id,
    email,
    firstName,
    id: coachId,
    lastName,
    name,
    organizationId: organizationIds[0] ?? organizationId,
    organizationIds,
    phone: currentCoach?.phone ?? "",
    role: "coach",
    status,
    teamIds: coachTeamIds,
    updatedAt: now,
    ...(uid || currentCoach?.uid ? { uid: uid || currentCoach?.uid } : {}),
  };

  if (currentCoach) {
    await repositories.coaches.update(coach.id, coach, {
      actor: getRecordActor(session),
      reason: "Admin updated coach assignment.",
    });
  } else {
    await repositories.coaches.create(coach, {
      actor: getRecordActor(session),
      reason: "Admin created coach assignment.",
    });
  }

  await updateTeamCoachHelpers({
    assignedTeamIds: teamIds,
    coachId,
    organizationId,
    session,
    status,
    updatedAt: now,
  });

  console.info("Coach assignment saved.", {
    coachId: coach.id,
    organizationId,
    status,
    teamCount: teamIds.length,
  });

  return {
    id: coach.id,
    message: `Coach assignment saved: ${coach.name}`,
    source: "firestore",
  };
}

async function createRegistrationInvite(
  session: AuthSession,
  payload: Extract<AdminSetupPayload, { actionType: "registration-invite" }>,
): Promise<AdminSetupResult> {
  const organizationId = normalizeText(payload.organizationId);
  const teamId = normalizeText(payload.teamId);
  const title = normalizeText(payload.title);
  const status = payload.status === "Paused" ? "Paused" : "Active";

  if (!organizationId || !teamId || !title) {
    createSetupError(
      "invalid-registration-invite",
      "Organization, team, and title are required.",
      400,
    );
  }

  assertClaimedOrganization(session, organizationId);

  const repositories = createFirestoreRepositories();
  const [organization, team] = await Promise.all([
    repositories.organizations.getById(organizationId),
    repositories.teams.getById(teamId),
  ]);

  if (!organization || !team || team.organizationId !== organizationId) {
    createSetupError(
      "team-required",
      "Create a team for this organization before opening registration.",
      400,
    );
  }

  const now = new Date().toISOString();
  const code = createLiveRecordId("invite", [
    organizationId,
    teamId,
    slugifyIdentityPart(title),
  ]);
  const invite: RegistrationInvite = {
    code,
    createdAt: now,
    createdByUid: session.user.id,
    description: `Registration offering for ${team.name}.`,
    documentRequirements: documentRequirementTemplates,
    id: `registration-invite-${code}`,
    inviteUrl: `/join/${code}`,
    organizationId,
    paymentRequirements: payload.includePayment ? paymentRequirementTemplates : [],
    qrLabel: `${team.name} Registration Link`,
    status,
    teamId,
    title,
    updatedAt: now,
  };

  await repositories.registrationInvites.create(invite, {
    actor: getRecordActor(session),
    reason: "Admin created registration invite setup.",
  });

  return {
    id: invite.code,
    message: `Registration invite created: ${invite.title}`,
    source: "firestore",
  };
}

export async function createAdminSetupRecord(
  payload: AdminSetupPayload,
  options: AdminSetupWriteOptions,
): Promise<AdminSetupResult> {
  const session = await requireAdminSetupSession(options.sessionSource);

  if (payload.actionType === "organization") {
    return createOrUpdateOrganization(session, payload);
  }

  if (payload.actionType === "team") {
    return createTeam(session, payload);
  }

  if (payload.actionType === "coach-assignment") {
    return createOrUpdateCoachAssignment(session, payload);
  }

  return createRegistrationInvite(session, payload);
}
