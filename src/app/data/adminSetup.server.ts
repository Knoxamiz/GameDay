import { cookies, headers } from "next/headers";
import { type AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import {
  createFirestoreRepositories,
  runFirestoreTransaction,
} from "../infrastructure/firebaseRepositories";
import {
  canManageOrganization,
  canUseAdminSetup,
  getAdminActor,
  resolveAdminOrganizationScope,
  verifyAdminRoleSession,
  type AdminOrganizationScope,
  type AdminOrganizationScopeSource,
} from "./adminOrganizationScope.server";
import { isActiveCoach, type Coach, type CoachAssignmentStatus } from "./coaches";
import {
  normalizeRegistrationInvite,
  type NormalizedRegistrationInvite,
  type RegistrationInvite,
  type RegistrationInviteStatus,
} from "./invites";
import {
  createLiveRecordId,
  normalizeDocumentIdSegment,
  slugifyIdentityPart,
} from "./liveIdentity";
import type { OrganizationMembership } from "./organizationMemberships";
import type { Organization } from "./organizations";
import { isCoachVisibleRosterRegistration, type Registration } from "./registrations";
import type { Team } from "./teams";

export type AdminSetupReadModel = {
  canCreateOrganization: boolean;
  canManageSetup: boolean;
  coaches: Coach[];
  organizationIds: string[];
  organizationMemberships: OrganizationMembership[];
  organizations: Organization[];
  registrationInvites: RegistrationInvite[];
  scopeSource: AdminOrganizationScopeSource;
  source: "empty" | "firestore";
  teams: Team[];
};

export type AdminSetupPayload =
  | {
      actionType: "organization-provisioning";
      name: string;
    }
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
      closesAt: string;
      description: string;
      maxAthletes?: number;
      opensAt: string;
      organizationId: string;
      status: Exclude<RegistrationInviteStatus, "archived">;
      teamId: string;
      title: string;
    }
  | {
      actionType: "registration-invite-update";
      closesAt: string;
      description: string;
      inviteCode: string;
      maxAthletes?: number;
      opensAt: string;
      operation: "archive" | "close" | "open" | "update";
      teamId: string;
      title: string;
    };

export type AdminSetupResult = {
  id: string;
  message: string;
  source: "firestore";
};

type AdminSetupWriteOptions = {
  activeOrganizationId?: string;
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

function normalizeOptionalDate(value: unknown, fieldLabel: string) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return undefined;
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    createSetupError(
      "invalid-registration-invite-date",
      `${fieldLabel} must be a valid date and time.`,
      400,
    );
  }

  return parsedDate.toISOString();
}

function normalizeOptionalMaxAthletes(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const maxAthletes = Number(value);

  if (!Number.isInteger(maxAthletes) || maxAthletes <= 0) {
    createSetupError(
      "invalid-registration-invite-capacity",
      "Athlete limit must be a positive whole number.",
      400,
    );
  }

  return maxAthletes;
}

function validateInviteSchedule(opensAt?: string, closesAt?: string) {
  if (opensAt && closesAt && Date.parse(closesAt) <= Date.parse(opensAt)) {
    createSetupError(
      "invalid-registration-invite-schedule",
      "Close time must be after open time.",
      400,
    );
  }
}

function buildCanonicalInviteRecord(
  invite: NormalizedRegistrationInvite,
  values: {
    archivedAt?: string;
    archivedByUid?: string;
    closesAt?: string;
    description: string;
    documentRequirements: RegistrationInvite["documentRequirements"];
    maxAthletes?: number;
    opensAt?: string;
    paymentRequirements: RegistrationInvite["paymentRequirements"];
    status: RegistrationInviteStatus;
    teamId: string;
    title: string;
    updatedAt: string;
    updatedByUid: string;
  },
): RegistrationInvite {
  return {
    ...(values.archivedAt ? { archivedAt: values.archivedAt } : {}),
    ...(values.archivedByUid
      ? { archivedByUid: values.archivedByUid }
      : {}),
    ...(values.closesAt ? { closesAt: values.closesAt } : {}),
    ...(invite.createdAt ? { createdAt: invite.createdAt } : {}),
    ...(invite.createdByUid ? { createdByUid: invite.createdByUid } : {}),
    description: values.description,
    documentRequirements: values.documentRequirements,
    id: invite.id,
    inviteCode: invite.inviteCode,
    inviteUrl: `/join/${invite.inviteCode}`,
    ...(values.maxAthletes ? { maxAthletes: values.maxAthletes } : {}),
    ...(values.opensAt ? { opensAt: values.opensAt } : {}),
    organizationId: invite.organizationId,
    paymentRequirements: values.paymentRequirements,
    qrLabel: `${values.title} Registration Link`,
    status: values.status,
    teamId: values.teamId,
    title: values.title,
    updatedAt: values.updatedAt,
    updatedByUid: values.updatedByUid,
  };
}

function getSlugFromId(value: string) {
  return slugifyIdentityPart(value);
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
    canCreateOrganization: false,
    canManageSetup: false,
    coaches: [],
    organizationIds,
    organizationMemberships: [],
    organizations: [],
    registrationInvites: [],
    scopeSource: "empty",
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

async function requireAdminSetupScope(
  source: AuthSessionSource,
  options: { requireOrganizationScope?: boolean } = {},
) {
  if (!getFirebaseAdminConfig()) {
    createSetupError(
      "firebase-unavailable",
      "Setup is not available until Firebase is configured.",
      503,
    );
  }

  const session = await verifyAdminRoleSession(source);

  if (!session) {
    createSetupError(
      "admin-session-required",
      "Please sign in as an admin before managing setup.",
      403,
    );
  }

  const scope = await resolveAdminOrganizationScope(session);

  if (!canUseAdminSetup(scope)) {
    createSetupError(
      "admin-setup-capability-required",
      "This admin cannot manage organization setup.",
      403,
    );
  }

  if (
    options.requireOrganizationScope !== false &&
    scope.organizationIds.length === 0
  ) {
    createSetupError(
      "admin-organization-scope-required",
      "Create an organization before managing setup.",
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

export async function getAdminSetupReadModel(
  activeOrganizationId?: string,
): Promise<AdminSetupReadModel> {
  if (!getFirebaseAdminConfig()) {
    return emptyReadModel();
  }

  try {
    const session = await verifyAdminRoleSession(await getAuthSessionSource());

    if (!session) {
      return emptyReadModel();
    }

    const scope = await resolveAdminOrganizationScope(session);

    if (!canUseAdminSetup(scope)) {
      return emptyReadModel();
    }

    if (scope.organizationIds.length === 0) {
      return {
        ...emptyReadModel(),
        canCreateOrganization: true,
        scopeSource: scope.source,
        source: "firestore",
      };
    }

    const organizationId = normalizeText(activeOrganizationId);

    if (!organizationId || !canManageOrganization(scope, organizationId)) {
      return {
        ...emptyReadModel(),
        canCreateOrganization: false,
        organizationMemberships: scope.memberships,
        scopeSource: scope.source,
        source: "firestore",
      };
    }

    const repositories = createFirestoreRepositories();
    const [organization, teams, coaches, registrationInvites] = await Promise.all([
      repositories.organizations.getById(organizationId),
      repositories.teams.listByOrganizationId(organizationId),
      repositories.coaches.listByOrganizationId(organizationId),
      repositories.registrationInvites.listByOrganizationId(organizationId),
    ]);

    return {
      canCreateOrganization: true,
      canManageSetup: true,
      coaches: uniqueById(coaches),
      organizationIds: [organizationId],
      organizationMemberships: scope.memberships,
      organizations: organization ? [organization] : [],
      registrationInvites: uniqueById(
        registrationInvites
          .map(normalizeRegistrationInvite)
          .filter(
            (invite): invite is NormalizedRegistrationInvite => Boolean(invite),
          ),
      ),
      scopeSource: scope.source,
      source: "firestore",
      teams: uniqueById(teams),
    };
  } catch (error) {
    console.warn("Could not load admin setup data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return emptyReadModel();
  }
}

async function getAvailableOrganizationId(name: string) {
  const repositories = createFirestoreRepositories();
  const baseOrganizationId = slugifyIdentityPart(name);

  if (!baseOrganizationId) {
    createSetupError(
      "invalid-organization-name",
      "Organization name must include letters or numbers.",
      400,
    );
  }

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const organizationId =
      suffix === 0 ? baseOrganizationId : `${baseOrganizationId}-${suffix + 1}`;
    const existingOrganization =
      await repositories.organizations.getById(organizationId);

    if (!existingOrganization) {
      return organizationId;
    }
  }

  createSetupError(
    "organization-id-unavailable",
    "Choose a more specific organization name.",
    409,
  );
}

function getMembershipId(organizationId: string, uid: string) {
  const uidSegment = normalizeDocumentIdSegment(uid);

  if (!uidSegment) {
    createSetupError(
      "invalid-membership-uid",
      "A valid signed-in user is required.",
      400,
    );
  }

  return `organization-membership-${organizationId}-${uidSegment}`;
}

async function createProvisionedOrganization(
  scope: AdminOrganizationScope,
  payload: Extract<
    AdminSetupPayload,
    { actionType: "organization-provisioning" }
  >,
): Promise<AdminSetupResult> {
  const session = scope.session;
  const name = normalizeText(payload.name);

  if (scope.organizationIds.length > 0) {
    createSetupError(
      "organization-provisioning-scope-exists",
      "This account already has organization access.",
      403,
    );
  }

  if (!name) {
    createSetupError(
      "invalid-organization",
      "Organization name is required.",
      400,
    );
  }

  const organizationId = await getAvailableOrganizationId(name);
  const now = new Date().toISOString();
  const organization: Organization = {
    adminIds: uniqueStringList([session.claims.adminId]),
    adminUids: [session.user.id],
    createdAt: now,
    createdByUid: session.user.id,
    id: organizationId,
    name,
    organizationId,
    ownerUid: session.user.id,
    ownerUids: [session.user.id],
    slug: getSlugFromId(organizationId),
    status: getOrganizationStatus({
      coaches: [],
      events: 0,
      registrations: [],
      teams: [],
    }),
    updatedAt: now,
  };
  const membership: OrganizationMembership = {
    createdAt: now,
    createdByUid: session.user.id,
    email: session.user.email ?? "",
    id: getMembershipId(organizationId, session.user.id),
    organizationId,
    role: "owner",
    status: "active",
    uid: session.user.id,
    updatedAt: now,
  };

  await runFirestoreTransaction(async (transaction) => {
    const [existingOrganization, existingMembership] = await Promise.all([
      transaction.get<Organization>("organizations", organization.id),
      transaction.get<OrganizationMembership>(
        "organizationMemberships",
        membership.id,
      ),
    ]);

    if (existingOrganization || existingMembership) {
      createSetupError(
        "organization-id-unavailable",
        "Choose a more specific organization name.",
        409,
      );
    }

    transaction.create("organizations", organization.id, organization);
    transaction.create(
      "organizationMemberships",
      membership.id,
      membership,
    );
  });

  console.info("Organization provisioned.", {
    membershipId: membership.id,
    organizationId,
    uid: session.user.id,
  });

  return {
    id: organization.id,
    message: `Organization created: ${organization.name}`,
    source: "firestore",
  };
}

async function createOrUpdateOrganization(
  scope: AdminOrganizationScope,
  payload: Extract<AdminSetupPayload, { actionType: "organization" }>,
): Promise<AdminSetupResult> {
  const session = scope.session;
  const organizationId = normalizeText(payload.organizationId);
  const name = normalizeText(payload.name);

  if (!organizationId || !name) {
    createSetupError(
      "invalid-organization",
      "Organization ID and name are required.",
      400,
    );
  }

  assertManagedOrganization(scope, organizationId);

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
    adminUids: uniqueStringList([
      ...(currentOrganization?.adminUids ?? []),
      session.user.id,
    ]),
    createdAt: currentOrganization?.createdAt ?? now,
    createdByUid: currentOrganization?.createdByUid ?? session.user.id,
    id: organizationId,
    name,
    organizationId: currentOrganization?.organizationId ?? organizationId,
    ownerUid: currentOrganization?.ownerUid ?? session.user.id,
    ownerUids: uniqueStringList([
      ...(currentOrganization?.ownerUids ?? []),
      currentOrganization?.ownerUid,
      session.user.id,
    ]),
    slug: currentOrganization?.slug ?? getSlugFromId(organizationId),
    status: getOrganizationStatus({
      coaches,
      events: events.length,
      registrations,
      teams,
    }),
    updatedAt: now,
  };
  const actor = getAdminActor(scope);

  if (currentOrganization) {
    await repositories.organizations.update(organizationId, organization, {
      actor,
      reason: "Admin updated organization setup.",
    });
  } else {
    const membership: OrganizationMembership = {
      createdAt: now,
      createdByUid: session.user.id,
      email: session.user.email ?? "",
      id: getMembershipId(organizationId, session.user.id),
      organizationId,
      role: "owner",
      status: "active",
      uid: session.user.id,
      updatedAt: now,
    };

    await runFirestoreTransaction(async (transaction) => {
      const [existingOrganization, existingMembership] = await Promise.all([
        transaction.get<Organization>("organizations", organizationId),
        transaction.get<OrganizationMembership>(
          "organizationMemberships",
          membership.id,
        ),
      ]);

      if (existingOrganization) {
        createSetupError(
          "organization-already-exists",
          "This organization was created by another request. Refresh and try again.",
          409,
        );
      }

      transaction.create("organizations", organizationId, organization);

      if (existingMembership) {
        transaction.set("organizationMemberships", membership.id, {
          ...membership,
          createdAt: existingMembership.createdAt,
          createdByUid: existingMembership.createdByUid,
        });
      } else {
        transaction.create(
          "organizationMemberships",
          membership.id,
          membership,
        );
      }
    });
  }

  return {
    id: organization.id,
    message: `Organization saved: ${organization.name}`,
    source: "firestore",
  };
}

async function createTeam(
  scope: AdminOrganizationScope,
  payload: Extract<AdminSetupPayload, { actionType: "team" }>,
): Promise<AdminSetupResult> {
  const session = scope.session;
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

  assertManagedOrganization(scope, organizationId);

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

  await runFirestoreTransaction(async (transaction) => {
    const [organization, existingTeam] = await Promise.all([
      transaction.get<Organization>("organizations", organizationId),
      transaction.get<Team>("teams", team.id),
    ]);

    if (!organization) {
      createSetupError(
        "organization-required",
        "Create the organization before creating teams.",
        400,
      );
    }

    if (existingTeam) {
      createSetupError(
        "team-already-exists",
        "A team with this name and season already exists.",
        409,
      );
    }

    transaction.create("teams", team.id, team);
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

async function createOrUpdateCoachAssignment(
  scope: AdminOrganizationScope,
  payload: Extract<AdminSetupPayload, { actionType: "coach-assignment" }>,
): Promise<AdminSetupResult> {
  const session = scope.session;
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

  assertManagedOrganization(scope, organizationId);

  const generatedCoachId = getCoachIdFromEmail(email);
  const { firstName, lastName } = getNameParts(name);
  const now = new Date().toISOString();
  const coach = await runFirestoreTransaction(async (transaction) => {
    const [organization, coachesByEmail, generatedCoach, organizationTeams] =
      await Promise.all([
        transaction.get<Organization>("organizations", organizationId),
        transaction.list<Coach>("coaches", {
          limit: 2,
          scope: { email },
        }),
        transaction.get<Coach>("coaches", generatedCoachId),
        transaction.list<Team>("teams", {
          scope: { organizationId },
        }),
      ]);

    if (!organization) {
      createSetupError(
        "organization-required",
        "Create the organization before assigning coaches.",
        400,
      );
    }

    if (coachesByEmail.length > 1) {
      createSetupError(
        "coach-email-conflict",
        "Multiple coach records use this email. Resolve them before assigning teams.",
        409,
      );
    }

    const currentCoachByEmail = coachesByEmail[0] ?? null;

    if (
      !currentCoachByEmail &&
      generatedCoach &&
      generatedCoach.email.toLowerCase() !== email
    ) {
      createSetupError(
        "coach-id-conflict",
        "This coach email conflicts with an existing coach record.",
        409,
      );
    }

    const currentCoach = currentCoachByEmail ?? generatedCoach;
    const coachId = currentCoach?.id ?? generatedCoachId;
    const organizationTeamMap = new Map(
      organizationTeams.map((team) => [team.id, team]),
    );
    const validTeams = teamIds
      .map((teamId) => organizationTeamMap.get(teamId))
      .filter((team): team is Team => Boolean(team));

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

    const externalTeamIds = (currentCoach?.teamIds ?? []).filter(
      (teamId) => !organizationTeamMap.has(teamId),
    );
    const externalTeams = await Promise.all(
      externalTeamIds.map((teamId) => transaction.get<Team>("teams", teamId)),
    );
    const otherOrganizationTeamIds = externalTeams
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
    const nextCoach: Coach = {
      coachId: currentCoach?.coachId ?? coachId,
      createdAt: currentCoach?.createdAt ?? now,
      createdByUid: currentCoach?.createdByUid ?? session.user.id,
      email,
      firstName,
      id: coachId,
      lastName,
      name,
      organizationId,
      organizationIds,
      phone: currentCoach?.phone ?? "",
      role: "coach",
      status,
      teamIds: coachTeamIds,
      updatedAt: now,
      ...(uid || currentCoach?.uid ? { uid: uid || currentCoach?.uid } : {}),
    };
    const activeAssignedTeamIds = new Set(
      status === "Active" ? teamIds : [],
    );

    if (currentCoach) {
      transaction.set("coaches", nextCoach.id, nextCoach);
    } else {
      transaction.create("coaches", nextCoach.id, nextCoach);
    }

    organizationTeams.forEach((team) => {
      const currentCoachIds = Array.isArray(team.coachIds) ? team.coachIds : [];
      const nextCoachIds = uniqueStringList([
        ...currentCoachIds.filter((teamCoachId) => teamCoachId !== coachId),
        activeAssignedTeamIds.has(team.id) ? coachId : undefined,
      ]);

      if (!hasSameMembers(currentCoachIds, nextCoachIds)) {
        transaction.update<Team>("teams", team.id, {
          coachIds: nextCoachIds,
          updatedAt: now,
        });
      }
    });

    return nextCoach;
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
  scope: AdminOrganizationScope,
  payload: Extract<AdminSetupPayload, { actionType: "registration-invite" }>,
): Promise<AdminSetupResult> {
  const session = scope.session;
  const organizationId = normalizeText(payload.organizationId);
  const teamId = normalizeText(payload.teamId);
  const title = normalizeText(payload.title);
  const description = normalizeText(payload.description);
  const status = payload.status;
  const opensAt = normalizeOptionalDate(payload.opensAt, "Open time");
  const closesAt = normalizeOptionalDate(payload.closesAt, "Close time");
  const maxAthletes = normalizeOptionalMaxAthletes(payload.maxAthletes);

  validateInviteSchedule(opensAt, closesAt);

  if (!organizationId || !teamId || !title) {
    createSetupError(
      "invalid-registration-invite",
      "Organization, team, and title are required.",
      400,
    );
  }

  assertManagedOrganization(scope, organizationId);

  const now = new Date().toISOString();
  const inviteCode = createLiveRecordId("invite", [
    organizationId,
    teamId,
    slugifyIdentityPart(title),
  ]);
  const invite: RegistrationInvite = {
    ...(closesAt ? { closesAt } : {}),
    createdAt: now,
    createdByUid: session.user.id,
    description,
    documentRequirements: [],
    id: `registration-invite-${inviteCode}`,
    inviteCode,
    inviteUrl: `/join/${inviteCode}`,
    ...(maxAthletes ? { maxAthletes } : {}),
    ...(opensAt ? { opensAt } : {}),
    organizationId,
    paymentRequirements: [],
    qrLabel: `${title} Registration Link`,
    status,
    teamId,
    title,
    updatedAt: now,
    updatedByUid: session.user.id,
  };

  await runFirestoreTransaction(async (transaction) => {
    const [organization, team, existingInvite] = await Promise.all([
      transaction.get<Organization>("organizations", organizationId),
      transaction.get<Team>("teams", teamId),
      transaction.get<RegistrationInvite>(
        "registrationInvites",
        invite.inviteCode,
        "inviteCode",
      ),
    ]);

    if (
      !organization ||
      !team ||
      team.organizationId !== organizationId ||
      team.lifecycleStatus === "Inactive"
    ) {
      createSetupError(
        "team-required",
        "Create a team for this organization before opening registration.",
        400,
      );
    }

    if (existingInvite) {
      createSetupError(
        "registration-invite-already-exists",
        "A registration invite with these details already exists.",
        409,
      );
    }

    transaction.create("registrationInvites", invite.inviteCode, {
      ...invite,
      description: description || `Registration offering for ${team.name}.`,
      qrLabel: `${team.name} Registration Link`,
    });
  });

  return {
    id: invite.inviteCode,
    message: `Registration invite created: ${invite.title}`,
    source: "firestore",
  };
}

async function updateRegistrationInvite(
  scope: AdminOrganizationScope,
  activeOrganizationId: string,
  payload: Extract<
    AdminSetupPayload,
    { actionType: "registration-invite-update" }
  >,
): Promise<AdminSetupResult> {
  const inviteCode = normalizeText(payload.inviteCode);

  if (!inviteCode) {
    createSetupError(
      "registration-invite-required",
      "Choose a registration invite.",
      400,
    );
  }

  const now = new Date().toISOString();
  const nextInvite = await runFirestoreTransaction(async (transaction) => {
    const storedInvite = await transaction.get<RegistrationInvite>(
      "registrationInvites",
      inviteCode,
      "inviteCode",
    );
    const invite = normalizeRegistrationInvite(storedInvite);

    if (!invite) {
      createSetupError(
        "registration-invite-not-found",
        "Registration invite not found.",
        404,
      );
    }

    assertManagedOrganization(scope, invite.organizationId);

    if (invite.organizationId !== activeOrganizationId) {
      createSetupError(
        "active-organization-mismatch",
        "This registration invite is outside the active organization.",
        403,
      );
    }

    if (invite.status === "archived" && payload.operation !== "archive") {
      createSetupError(
        "registration-invite-archived",
        "Archived registration invites cannot be changed.",
        409,
      );
    }

    const isUpdate = payload.operation === "update";
    const teamId = invite.teamId;
    const title = isUpdate ? normalizeText(payload.title) : invite.title;
    const description = isUpdate
      ? normalizeText(payload.description)
      : invite.description ?? "";
    const opensAt = isUpdate
      ? normalizeOptionalDate(payload.opensAt, "Open time")
      : invite.opensAt;
    const closesAt = isUpdate
      ? normalizeOptionalDate(payload.closesAt, "Close time")
      : invite.closesAt;
    const maxAthletes = isUpdate
      ? normalizeOptionalMaxAthletes(payload.maxAthletes)
      : invite.maxAthletes;

    if (!teamId || !title) {
      createSetupError(
        "invalid-registration-invite",
        "Team and title are required.",
        400,
      );
    }

    if (payload.operation === "update" || payload.operation === "open") {
      validateInviteSchedule(opensAt, closesAt);

      const team = await transaction.get<Team>("teams", teamId);

      if (
        !team ||
        team.organizationId !== invite.organizationId ||
        team.lifecycleStatus === "Inactive"
      ) {
        createSetupError(
          "registration-invite-team-required",
          "Choose an active team in this organization.",
          400,
        );
      }
    }

    const status: RegistrationInviteStatus =
      payload.operation === "open"
        ? "open"
        : payload.operation === "close"
          ? "closed"
          : payload.operation === "archive"
            ? "archived"
            : invite.status;
    const updatedInvite = buildCanonicalInviteRecord(invite, {
      ...(status === "archived" ? { archivedAt: now } : {}),
      ...(status === "archived"
        ? { archivedByUid: scope.session.user.id }
        : {}),
      closesAt,
      description,
      documentRequirements: invite.documentRequirements,
      maxAthletes,
      opensAt,
      paymentRequirements: invite.paymentRequirements,
      status,
      teamId,
      title,
      updatedAt: now,
      updatedByUid: scope.session.user.id,
    });

    transaction.set("registrationInvites", inviteCode, updatedInvite);
    return updatedInvite;
  });

  console.info("Registration invite lifecycle updated.", {
    inviteCode: nextInvite.inviteCode,
    operation: payload.operation,
    organizationId: nextInvite.organizationId,
    status: nextInvite.status,
  });

  return {
    id: nextInvite.inviteCode,
    message:
      payload.operation === "archive"
        ? `Registration invite archived: ${nextInvite.title}`
        : payload.operation === "open"
          ? `Registration invite opened: ${nextInvite.title}`
          : payload.operation === "close"
            ? `Registration invite closed: ${nextInvite.title}`
            : `Registration invite updated: ${nextInvite.title}`,
    source: "firestore",
  };
}

export async function createAdminSetupRecord(
  payload: AdminSetupPayload,
  options: AdminSetupWriteOptions,
): Promise<AdminSetupResult> {
  const scope = await requireAdminSetupScope(options.sessionSource, {
    requireOrganizationScope: payload.actionType !== "organization-provisioning",
  });

  if (payload.actionType === "organization-provisioning") {
    return createProvisionedOrganization(scope, payload);
  }

  const activeOrganizationId = normalizeText(options.activeOrganizationId);

  if (
    !activeOrganizationId ||
    !canManageOrganization(scope, activeOrganizationId)
  ) {
    createSetupError(
      "active-organization-required",
      "Choose an organization you manage before changing setup.",
      403,
    );
  }

  if (
    "organizationId" in payload &&
    payload.organizationId !== activeOrganizationId
  ) {
    createSetupError(
      "active-organization-mismatch",
      "This setup change is outside the active organization.",
      403,
    );
  }

  if (payload.actionType === "organization") {
    return createOrUpdateOrganization(scope, payload);
  }

  if (payload.actionType === "team") {
    return createTeam(scope, payload);
  }

  if (payload.actionType === "coach-assignment") {
    return createOrUpdateCoachAssignment(scope, payload);
  }

  if (payload.actionType === "registration-invite") {
    return createRegistrationInvite(scope, payload);
  }

  return updateRegistrationInvite(scope, activeOrganizationId, payload);
}
