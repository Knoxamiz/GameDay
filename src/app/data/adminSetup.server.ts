import { cookies, headers } from "next/headers";
import {
  hasCapability,
  type AuthSession,
  type AuthSessionSource,
} from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { documentRequirementTemplates } from "./documents";
import type { RegistrationInvite } from "./invites";
import { createLiveRecordId, slugifyIdentityPart } from "./liveIdentity";
import type { Organization } from "./organizations";
import { paymentRequirementTemplates } from "./payments";
import type { Team } from "./teams";

export type AdminSetupReadModel = {
  canManageSetup: boolean;
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

function emptyReadModel(
  organizationIds: string[] = [],
): AdminSetupReadModel {
  return {
    canManageSetup: false,
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
  teams,
}: {
  coaches: number;
  events: number;
  teams: Team[];
}) {
  return {
    activeTeams: teams.filter((team) => team.lifecycleStatus !== "Inactive")
      .length,
    coaches,
    registeredPlayers: teams.reduce(
      (playerCount, team) => playerCount + team.playerCount,
      0,
    ),
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
    const [organizations, teamLists, inviteList] = await Promise.all([
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
      repositories.registrationInvites.list(),
    ]);
    const organizationSet = new Set(organizationIds);

    return {
      canManageSetup: true,
      organizationIds,
      organizations: organizations.filter(
        (organization): organization is Organization => Boolean(organization),
      ),
      registrationInvites: inviteList.filter((invite) =>
        organizationSet.has(invite.organizationId),
      ),
      source: "firestore",
      teams: teamLists.flat(),
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
  const [currentOrganization, teams, coaches, events] = await Promise.all([
    repositories.organizations.getById(organizationId),
    repositories.teams.listByOrganizationId(organizationId),
    repositories.coaches.listByOrganizationId(organizationId),
    repositories.events.listByOrganizationId(organizationId),
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
      coaches: coaches.length,
      events: events.length,
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

  return createRegistrationInvite(session, payload);
}
