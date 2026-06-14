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
import {
  isActiveCoachAssignment,
  type CoachAssignment,
  type CoachAssignmentStatus,
} from "./coachAssignmentRecords";
import type { Coach } from "./coaches";
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
import {
  getTeamLifecycleStatus,
  isActiveTeam,
  type Team,
  type TeamLifecycleStatus,
} from "./teams";

export type AdminSetupReadModel = {
  canCreateOrganization: boolean;
  canManageSetup: boolean;
  coachAssignments: CoachAssignment[];
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
      status: Exclude<TeamLifecycleStatus, "archived">;
    }
  | {
      actionType: "team-update";
      division: string;
      name: string;
      organizationId: string;
      season: string;
      status: TeamLifecycleStatus;
      teamId: string;
    }
  | {
      actionType: "coach-assignment";
      assignmentId?: string;
      coachId?: string;
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
    coachAssignments: [],
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
  coachAssignments,
  events,
  registrations,
  teams,
}: {
  coachAssignments: CoachAssignment[];
  events: number;
  registrations: Registration[];
  teams: Team[];
}) {
  return {
    activeTeams: teams.filter(isActiveTeam).length,
    coaches: coachAssignments.filter(isActiveCoachAssignment).length,
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
    const [organization, teams, coachAssignments, registrationInvites] =
      await Promise.all([
        repositories.organizations.getById(organizationId),
        repositories.teams.listByOrganizationId(organizationId),
        repositories.coachAssignments.listByOrganizationId(organizationId),
        repositories.registrationInvites.listByOrganizationId(organizationId),
      ]);
    const coaches = await Promise.all(
      uniqueStringList(
        coachAssignments.map((assignment) => assignment.coachId),
      ).map((coachId) => repositories.coaches.getById(coachId)),
    );

    return {
      canCreateOrganization: true,
      canManageSetup: true,
      coachAssignments: uniqueById(coachAssignments),
      coaches: uniqueById(
        coaches.filter((coach): coach is Coach => Boolean(coach)),
      ),
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
      coachAssignments: [],
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
  const [currentOrganization, teams, coachAssignments, events, registrations] = await Promise.all([
    repositories.organizations.getById(organizationId),
    repositories.teams.listByOrganizationId(organizationId),
    repositories.coachAssignments.listByOrganizationId(organizationId),
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
      coachAssignments,
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
  const status = payload.status === "inactive" ? "inactive" : "active";

  if (!organizationId || !name || !division || !season) {
    createSetupError(
      "invalid-team",
      "Organization, team name, division, and season are required.",
      400,
    );
  }

  assertManagedOrganization(scope, organizationId);

  const now = new Date().toISOString();
  const teamId = createLiveRecordId("team", [organizationId, name, season]);
  const team: Team = {
    ageGroup: division,
    athleteIds: [],
    coachIds: [],
    createdAt: now,
    createdByUid: session.user.id,
    division,
    eventIds: [],
    id: teamId,
    label: division,
    name,
    organizationId,
    playerCount: 0,
    rosterPreviewIds: [],
    season,
    status,
    teamId,
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

async function updateTeam(
  scope: AdminOrganizationScope,
  payload: Extract<AdminSetupPayload, { actionType: "team-update" }>,
): Promise<AdminSetupResult> {
  const organizationId = normalizeText(payload.organizationId);
  const teamId = normalizeText(payload.teamId);
  const name = normalizeText(payload.name);
  const division = normalizeText(payload.division);
  const season = normalizeText(payload.season);

  if (!organizationId || !teamId || !name || !division || !season) {
    createSetupError(
      "invalid-team-update",
      "Team, name, division, and season are required.",
      400,
    );
  }

  assertManagedOrganization(scope, organizationId);

  const now = new Date().toISOString();
  const nextTeam = await runFirestoreTransaction(async (transaction) => {
    const [team, organizationTeams] = await Promise.all([
      transaction.get<Team>("teams", teamId),
      transaction.list<Team>("teams", { scope: { organizationId } }),
    ]);

    if (!team) {
      createSetupError("team-not-found", "Team not found.", 404);
    }

    if (team.organizationId !== organizationId) {
      createSetupError(
        "team-organization-immutable",
        "A team cannot be moved to another organization.",
        403,
      );
    }

    const duplicateTeam = organizationTeams.find(
      (candidate) =>
        candidate.id !== team.id &&
        normalizeText(candidate.name).toLowerCase() === name.toLowerCase() &&
        normalizeText(candidate.season).toLowerCase() === season.toLowerCase() &&
        getTeamLifecycleStatus(candidate) !== "archived",
    );

    if (duplicateTeam) {
      createSetupError(
        "team-name-season-conflict",
        "Another team with this name and season already exists.",
        409,
      );
    }

    const updatedTeam: Team = {
      ...team,
      ageGroup: division,
      division,
      label: division,
      name,
      season,
      status: payload.status,
      teamId: team.teamId ?? team.id,
      updatedAt: now,
    };

    delete updatedTeam.lifecycleStatus;

    if (payload.status === "archived") {
      updatedTeam.archivedAt = team.archivedAt ?? now;
      updatedTeam.archivedByUid =
        team.archivedByUid ?? scope.session.user.id;
    } else {
      delete updatedTeam.archivedAt;
      delete updatedTeam.archivedByUid;
    }

    transaction.set("teams", team.id, updatedTeam);
    return updatedTeam;
  });

  console.info("Team lifecycle updated.", {
    organizationId,
    status: getTeamLifecycleStatus(nextTeam),
    teamId: nextTeam.id,
  });

  return {
    id: nextTeam.id,
    message:
      payload.status === "archived"
        ? `Team archived: ${nextTeam.name}. Historical records were preserved.`
        : `Team updated: ${nextTeam.name}`,
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

function getCoachAssignmentId(organizationId: string, coachId: string) {
  return `coach-assignment-${normalizeDocumentIdSegment(
    organizationId,
  )}-${normalizeDocumentIdSegment(coachId)}`;
}

async function createOrUpdateCoachAssignment(
  scope: AdminOrganizationScope,
  payload: Extract<AdminSetupPayload, { actionType: "coach-assignment" }>,
): Promise<AdminSetupResult> {
  const session = scope.session;
  const organizationId = normalizeText(payload.organizationId);
  const requestedAssignmentId = normalizeText(payload.assignmentId);
  const requestedCoachId = normalizeText(payload.coachId);
  const email = normalizeText(payload.email).toLowerCase();
  const name = normalizeText(payload.name);
  const uid = normalizeText(payload.uid);
  const status = payload.status;
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
  const assignment = await runFirestoreTransaction(async (transaction) => {
    const [
      organization,
      coachesByEmail,
      coachesByUid,
      generatedCoach,
      organizationTeams,
      requestedAssignment,
      requestedCoach,
    ] =
      await Promise.all([
        transaction.get<Organization>("organizations", organizationId),
        transaction.list<Coach>("coaches", {
          limit: 2,
          scope: { email },
        }),
        uid
          ? transaction.list<Coach>("coaches", {
              limit: 2,
              scope: { uid },
            })
          : [],
        transaction.get<Coach>("coaches", generatedCoachId),
        transaction.list<Team>("teams", {
          scope: { organizationId },
        }),
        requestedAssignmentId
          ? transaction.get<CoachAssignment>(
              "coachAssignments",
              requestedAssignmentId,
            )
          : null,
        requestedCoachId
          ? transaction.get<Coach>("coaches", requestedCoachId)
          : null,
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

    if (coachesByUid.length > 1) {
      createSetupError(
        "coach-uid-conflict",
        "Multiple coach records use this Firebase UID. Resolve them before assigning teams.",
        409,
      );
    }

    if (requestedAssignmentId && !requestedAssignment) {
      createSetupError(
        "coach-assignment-not-found",
        "Coach assignment not found.",
        404,
      );
    }

    if (
      requestedAssignment &&
      requestedAssignment.organizationId !== organizationId
    ) {
      createSetupError(
        "coach-assignment-organization-mismatch",
        "A coach assignment cannot be moved to another organization.",
        403,
      );
    }

    if (
      requestedAssignment &&
      requestedCoachId &&
      requestedAssignment.coachId !== requestedCoachId
    ) {
      createSetupError(
        "coach-assignment-identity-mismatch",
        "A coach assignment cannot be moved to another coach profile.",
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

    const currentCoach = requestedCoach ?? currentCoachByEmail ?? generatedCoach;
    const coachId = requestedAssignment?.coachId ?? currentCoach?.id ?? generatedCoachId;
    const currentCoachByUid = coachesByUid[0] ?? null;

    if (currentCoachByEmail && currentCoachByEmail.id !== coachId) {
      createSetupError(
        "coach-email-conflict",
        "This email belongs to another coach profile.",
        409,
      );
    }

    if (currentCoachByUid && currentCoachByUid.id !== coachId) {
      createSetupError(
        "coach-uid-conflict",
        "This Firebase UID belongs to another coach profile.",
        409,
      );
    }

    const organizationTeamMap = new Map(
      organizationTeams.map((team) => [team.id, team]),
    );
    const validTeams = teamIds
      .map((teamId) => organizationTeamMap.get(teamId))
      .filter((team): team is Team => Boolean(team));

    const [existingAssignments, organizationAssignments] = await Promise.all([
      transaction.list<CoachAssignment>("coachAssignments", {
        scope: { coachId },
      }),
      transaction.list<CoachAssignment>("coachAssignments", {
        scope: { organizationId },
      }),
    ]);
    const currentAssignment =
      requestedAssignment ??
      existingAssignments.find(
        (candidate) => candidate.organizationId === organizationId,
      );
    const hasAssignmentsOutsideOrganization = existingAssignments.some(
      (candidate) => candidate.organizationId !== organizationId,
    );
    const changesSharedIdentity = Boolean(
      currentCoach &&
        (normalizeText(currentCoach.name) !== name ||
          normalizeText(currentCoach.email).toLowerCase() !== email ||
          (uid && normalizeText(currentCoach.uid) !== uid)),
    );

    if (hasAssignmentsOutsideOrganization && changesSharedIdentity) {
      createSetupError(
        "shared-coach-identity-immutable",
        "This coach also belongs to another organization. Update only this organization's assignment, or use a platform identity workflow to change shared profile details.",
        409,
      );
    }

    const teamIdsChanged = !hasSameMembers(
      currentAssignment?.teamIds ?? [],
      teamIds,
    );
    const requiresActiveTeams = status === "active" || teamIdsChanged;

    if (
      validTeams.length !== teamIds.length ||
      validTeams.some(
        (team) =>
          team.organizationId !== organizationId ||
          (requiresActiveTeams && !isActiveTeam(team)),
      )
    ) {
      createSetupError(
        "coach-team-scope-invalid",
        requiresActiveTeams
          ? "Coaches can only be assigned to active teams inside this organization."
          : "Coaches can only be assigned to teams inside this organization.",
        403,
      );
    }

    const legacyTeams = await Promise.all(
      (currentCoach?.teamIds ?? []).map((teamId) =>
        transaction.get<Team>("teams", teamId),
      ),
    );
    const legacyTeamsByOrganization = new Map<string, string[]>();

    legacyTeams
      .filter((team): team is Team => Boolean(team))
      .forEach((team) => {
        legacyTeamsByOrganization.set(
          team.organizationId,
          uniqueStringList([
            ...(legacyTeamsByOrganization.get(team.organizationId) ?? []),
            team.id,
          ]),
        );
      });

    const nextCoach: Coach = {
      coachId: currentCoach?.coachId ?? coachId,
      createdAt: currentCoach?.createdAt ?? now,
      createdByUid: currentCoach?.createdByUid ?? session.user.id,
      email,
      firstName,
      id: coachId,
      lastName,
      name,
      phone: currentCoach?.phone ?? "",
      role: "coach",
      updatedAt: now,
      ...(uid || currentCoach?.uid ? { uid: uid || currentCoach?.uid } : {}),
    };
    const assignmentId = getCoachAssignmentId(organizationId, coachId);
    const nextAssignment: CoachAssignment = {
      coachId,
      createdAt: currentAssignment?.createdAt ?? now,
      createdByUid: currentAssignment?.createdByUid ?? session.user.id,
      email,
      id: currentAssignment?.id ?? assignmentId,
      organizationId,
      role: currentAssignment?.role ?? "coach",
      status,
      teamIds,
      updatedAt: now,
      ...(uid || currentCoach?.uid ? { uid: uid || currentCoach?.uid } : {}),
    };

    if (status === "archived") {
      nextAssignment.archivedAt = currentAssignment?.archivedAt ?? now;
      nextAssignment.archivedByUid =
        currentAssignment?.archivedByUid ?? session.user.id;
    } else {
      delete nextAssignment.archivedAt;
      delete nextAssignment.archivedByUid;
    }

    if (currentCoach) {
      transaction.set("coaches", nextCoach.id, nextCoach);
    } else {
      transaction.create("coaches", nextCoach.id, nextCoach);
    }

    legacyTeamsByOrganization.forEach((legacyTeamIds, legacyOrganizationId) => {
      if (
        legacyOrganizationId === organizationId ||
        existingAssignments.some(
          (candidate) => candidate.organizationId === legacyOrganizationId,
        )
      ) {
        return;
      }

      const migratedAssignment: CoachAssignment = {
        coachId,
        createdAt: currentCoach?.createdAt ?? now,
        createdByUid: currentCoach?.createdByUid ?? session.user.id,
        email,
        id: getCoachAssignmentId(legacyOrganizationId, coachId),
        organizationId: legacyOrganizationId,
        role: "coach",
        status: currentCoach?.status === "Inactive" ? "inactive" : "active",
        teamIds: legacyTeamIds,
        updatedAt: now,
        ...(uid || currentCoach?.uid ? { uid: uid || currentCoach?.uid } : {}),
      };

      transaction.create(
        "coachAssignments",
        migratedAssignment.id,
        migratedAssignment,
      );
    });

    if (currentAssignment) {
      transaction.set("coachAssignments", nextAssignment.id, nextAssignment);
    } else {
      transaction.create("coachAssignments", nextAssignment.id, nextAssignment);
    }

    const finalOrganizationAssignments = [
      ...organizationAssignments.filter(
        (candidate) => candidate.id !== nextAssignment.id,
      ),
      nextAssignment,
    ];

    organizationTeams.forEach((team) => {
      const currentCoachIds = Array.isArray(team.coachIds) ? team.coachIds : [];
      const nextCoachIds = uniqueStringList(
        finalOrganizationAssignments
          .filter(
            (candidate) =>
              isActiveCoachAssignment(candidate) &&
              candidate.teamIds.includes(team.id),
          )
          .map((candidate) => candidate.coachId),
      );

      if (!hasSameMembers(currentCoachIds, nextCoachIds)) {
        transaction.update<Team>("teams", team.id, {
          coachIds: nextCoachIds,
          updatedAt: now,
        });
      }
    });

    return nextAssignment;
  });

  console.info("Coach assignment saved.", {
    assignmentId: assignment.id,
    coachId: assignment.coachId,
    organizationId,
    status,
    teamCount: teamIds.length,
  });

  return {
    id: assignment.id,
    message:
      assignment.status === "archived"
        ? `Coach assignment archived: ${name}`
        : `Coach assignment saved: ${name}`,
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
      !isActiveTeam(team)
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
        !isActiveTeam(team)
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

  if (payload.actionType === "team-update") {
    return updateTeam(scope, payload);
  }

  if (payload.actionType === "coach-assignment") {
    return createOrUpdateCoachAssignment(scope, payload);
  }

  if (payload.actionType === "registration-invite") {
    return createRegistrationInvite(scope, payload);
  }

  return updateRegistrationInvite(scope, activeOrganizationId, payload);
}
