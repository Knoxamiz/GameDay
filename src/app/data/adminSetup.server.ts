import { cookies, headers } from "next/headers";
import { type AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { getFirebaseAdminUser } from "../infrastructure/firebaseAuth";
import {
  createFirestoreRepositories,
  runFirestoreTransaction,
} from "../infrastructure/firebaseRepositories";
import {
  canManageOrganization,
  canUseAdminSetup,
  getAdminActor,
  getOrganizationManagementAuthority,
  resolveAdminOrganizationScope,
  verifyAdminAccessSession,
  type AdminOrganizationScope,
  type AdminOrganizationScopeSource,
  type OrganizationManagementAuthority,
} from "./adminOrganizationScope.server";
import {
  isActiveCoachAssignment,
  type CoachAssignment,
  type CoachAssignmentStatus,
} from "./coachAssignmentRecords";
import type { Coach } from "./coaches";
import type { GameDayEvent } from "./events";
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
import {
  canManageOrganizationMembership,
  type OrganizationMembership,
  type OrganizationMembershipRole,
} from "./organizationMemberships";
import type {
  Organization,
  OrganizationWorkspaceType,
} from "./organizations";
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
  events: GameDayEvent[];
  organizationIds: string[];
  organizationManagementAuthority: OrganizationManagementAuthority | null;
  organizationMemberships: OrganizationMembership[];
  organizations: Organization[];
  registrationInvites: RegistrationInvite[];
  registrations: Registration[];
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
      actionType: "workspace-provisioning";
      division?: string;
      name: string;
      season?: string;
      workspaceType: OrganizationWorkspaceType;
    }
  | {
      actionType: "organization";
      name: string;
      organizationId: string;
    }
  | {
      actionType: "organization-archive";
      organizationId: string;
    }
  | {
      actionType: "organization-membership-invite";
      email: string;
      organizationId: string;
      role: OrganizationMembershipRole;
    }
  | {
      actionType: "organization-membership-update";
      membershipId: string;
      operation: "activate" | "remove" | "suspend" | "update";
      organizationId: string;
      role: OrganizationMembershipRole;
      uid?: string;
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
  teamId?: string;
  workspaceType?: OrganizationWorkspaceType;
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
    events: [],
    organizationIds,
    organizationManagementAuthority: null,
    organizationMemberships: [],
    organizations: [],
    registrationInvites: [],
    registrations: [],
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

  const session = await verifyAdminAccessSession(source);

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
    const session = await verifyAdminAccessSession(await getAuthSessionSource());

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
        scopeSource: scope.source,
        source: "firestore",
      };
    }

    const repositories = createFirestoreRepositories();
    const [
      organization,
      teams,
      coachAssignments,
      registrationInvites,
      organizationMemberships,
      events,
      registrations,
    ] = await Promise.all([
      repositories.organizations.getById(organizationId),
      repositories.teams.listByOrganizationId(organizationId),
      repositories.coachAssignments.listByOrganizationId(organizationId),
      repositories.registrationInvites.listByOrganizationId(organizationId),
      repositories.organizationMemberships.listByOrganizationId(
        organizationId,
      ),
      repositories.events.listByOrganizationId(organizationId),
      repositories.registrations.listByOrganizationId(organizationId),
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
      events: uniqueById(events),
      organizationIds: [organizationId],
      organizationManagementAuthority: getOrganizationManagementAuthority(
        scope,
        organizationId,
      ),
      organizationMemberships: uniqueById(organizationMemberships),
      organizations: organization ? [organization] : [],
      registrationInvites: uniqueById(
        registrationInvites
          .map(normalizeRegistrationInvite)
          .filter(
            (invite): invite is NormalizedRegistrationInvite => Boolean(invite),
          ),
      ),
      registrations: uniqueById(registrations),
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

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function getTransactionManagementAuthority(
  scope: AdminOrganizationScope,
  organizationId: string,
  memberships: OrganizationMembership[],
): OrganizationManagementAuthority | null {
  const actorMemberships = memberships.filter(
    (membership) => membership.uid === scope.session.user.id,
  );
  const activeActorMembership = actorMemberships.find(
    canManageOrganizationMembership,
  );

  if (
    activeActorMembership?.role === "owner" ||
    activeActorMembership?.role === "admin"
  ) {
    return activeActorMembership.role;
  }

  if (actorMemberships.length > 0) {
    return null;
  }

  return scope.claimOrganizationIds.includes(organizationId)
    ? "bootstrap-admin"
    : null;
}

function assertMembershipManagementAuthority(
  authority: OrganizationManagementAuthority | null,
): asserts authority is OrganizationManagementAuthority {
  if (!authority) {
    createSetupError(
      "organization-membership-authority-required",
      "Your organization membership no longer allows member management.",
      403,
    );
  }
}

function assertOwnerRoleAuthority(
  authority: OrganizationManagementAuthority,
  currentRole: OrganizationMembershipRole | undefined,
  nextRole: OrganizationMembershipRole,
) {
  if (
    authority !== "owner" &&
    (currentRole === "owner" || nextRole === "owner")
  ) {
    createSetupError(
      "organization-owner-authority-required",
      "Only an active organization owner can manage owner access.",
      403,
    );
  }
}

function isActiveOwner(membership: OrganizationMembership) {
  return (
    membership.status === "active" &&
    membership.role === "owner" &&
    Boolean(membership.uid)
  );
}

function isActiveManager(membership: OrganizationMembership) {
  return Boolean(
    canManageOrganizationMembership(membership) && membership.uid,
  );
}

function assertMembershipContinuity(
  currentMemberships: OrganizationMembership[],
  currentMembership: OrganizationMembership,
  nextMembership: OrganizationMembership,
  actorUid: string,
) {
  const nextMemberships = currentMemberships.map((membership) =>
    membership.id === nextMembership.id ? nextMembership : membership,
  );

  if (
    isActiveOwner(currentMembership) &&
    !isActiveOwner(nextMembership) &&
    !nextMemberships.some(isActiveOwner)
  ) {
    createSetupError(
      "last-active-owner-required",
      "Add another active owner before changing the last active owner.",
      409,
    );
  }

  if (
    currentMembership.uid === actorUid &&
    isActiveManager(currentMembership) &&
    !isActiveManager(nextMembership) &&
    !nextMemberships.some(isActiveManager)
  ) {
    createSetupError(
      "last-active-manager-required",
      "Add another active owner or admin before removing your own access.",
      409,
    );
  }
}

async function inviteOrganizationMembership(
  scope: AdminOrganizationScope,
  payload: Extract<
    AdminSetupPayload,
    { actionType: "organization-membership-invite" }
  >,
): Promise<AdminSetupResult> {
  const organizationId = normalizeText(payload.organizationId);
  const email = normalizeEmail(payload.email);

  if (!organizationId || !email || !email.includes("@")) {
    createSetupError(
      "invalid-organization-membership-invite",
      "A valid member email is required.",
      400,
    );
  }

  assertManagedOrganization(scope, organizationId);

  const now = new Date().toISOString();
  const membership: OrganizationMembership = {
    createdAt: now,
    createdByUid: scope.session.user.id,
    email,
    id: createLiveRecordId("organization-membership", [
      organizationId,
      email,
    ]),
    invitedByUid: scope.session.user.id,
    organizationId,
    role: payload.role,
    status: "invited",
    updatedAt: now,
  };

  await runFirestoreTransaction(async (transaction) => {
    const memberships = await transaction.list<OrganizationMembership>(
      "organizationMemberships",
      { scope: { organizationId } },
    );
    const authority = getTransactionManagementAuthority(
      scope,
      organizationId,
      memberships,
    );

    assertMembershipManagementAuthority(authority);
    assertOwnerRoleAuthority(authority, undefined, membership.role);

    if (
      memberships.some(
        (candidate) =>
          normalizeEmail(candidate.email) === email &&
          candidate.status !== "removed",
      )
    ) {
      createSetupError(
        "organization-membership-email-exists",
        "This email already has a current membership record.",
        409,
      );
    }

    transaction.create(
      "organizationMemberships",
      membership.id,
      membership,
    );
  });

  console.info("Organization membership invited.", {
    membershipId: membership.id,
    organizationId,
    role: membership.role,
  });

  return {
    id: membership.id,
    message: `Membership invited: ${membership.email}`,
    source: "firestore",
  };
}

async function getVerifiedMembershipUid(
  membership: OrganizationMembership,
  requestedUid: string,
) {
  const membershipUid = membership.uid ?? requestedUid;

  if (membership.uid) {
    if (requestedUid && requestedUid !== membership.uid) {
      createSetupError(
        "organization-membership-uid-immutable",
        "An active membership cannot be linked to a different Firebase user.",
        409,
      );
    }

    if (membership.status === "suspended") {
      return membership.uid;
    }
  }

  if (!membershipUid) {
    createSetupError(
      "organization-membership-uid-required",
      "Enter the invited user's Firebase UID before activating access.",
      400,
    );
  }

  let firebaseUser: Awaited<ReturnType<typeof getFirebaseAdminUser>>;

  try {
    firebaseUser = await getFirebaseAdminUser(membershipUid);
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : "";

    if (code !== "auth/user-not-found") {
      createSetupError(
        "firebase-auth-unavailable",
        "Firebase user verification is temporarily unavailable.",
        503,
      );
    }

    createSetupError(
      "organization-membership-user-not-found",
      "No Firebase user was found for that UID.",
      400,
    );
  }

  if (!firebaseUser) {
    createSetupError(
      "firebase-auth-unavailable",
      "Firebase user verification is temporarily unavailable.",
      503,
    );
  }

  if (normalizeEmail(firebaseUser.email) !== normalizeEmail(membership.email)) {
    createSetupError(
      "organization-membership-email-mismatch",
      "The Firebase user's email does not match this invitation.",
      409,
    );
  }

  return firebaseUser.uid;
}

async function updateOrganizationMembership(
  scope: AdminOrganizationScope,
  payload: Extract<
    AdminSetupPayload,
    { actionType: "organization-membership-update" }
  >,
): Promise<AdminSetupResult> {
  const organizationId = normalizeText(payload.organizationId);
  const membershipId = normalizeText(payload.membershipId);

  if (!organizationId || !membershipId) {
    createSetupError(
      "invalid-organization-membership",
      "Choose a valid organization membership.",
      400,
    );
  }

  assertManagedOrganization(scope, organizationId);

  const repositories = createFirestoreRepositories();
  const currentMembership =
    await repositories.organizationMemberships.getById(membershipId);

  if (
    !currentMembership ||
    currentMembership.organizationId !== organizationId
  ) {
    createSetupError(
      "organization-membership-not-found",
      "That membership does not exist in the active organization.",
      404,
    );
  }

  if (
    payload.operation === "activate" &&
    (currentMembership.status === "active" ||
      currentMembership.status === "removed")
  ) {
    createSetupError(
      currentMembership.status === "active"
        ? "organization-membership-already-active"
        : "organization-membership-removed",
      currentMembership.status === "active"
        ? "This membership is already active."
        : "Removed memberships are retained for audit history and cannot be changed.",
      409,
    );
  }

  const requestedUid = normalizeText(payload.uid);
  const verifiedUid =
    payload.operation === "activate"
      ? await getVerifiedMembershipUid(currentMembership, requestedUid)
      : undefined;
  const now = new Date().toISOString();
  const nextMembership = await runFirestoreTransaction(async (transaction) => {
    const memberships = await transaction.list<OrganizationMembership>(
      "organizationMemberships",
      { scope: { organizationId } },
    );
    const membership = memberships.find(
      (candidate) => candidate.id === membershipId,
    );

    if (!membership) {
      createSetupError(
        "organization-membership-not-found",
        "That membership no longer exists in the active organization.",
        404,
      );
    }

    const authority = getTransactionManagementAuthority(
      scope,
      organizationId,
      memberships,
    );

    assertMembershipManagementAuthority(authority);
    assertOwnerRoleAuthority(authority, membership.role, payload.role);

    if (membership.status === "removed") {
      createSetupError(
        "organization-membership-removed",
        "Removed memberships are retained for audit history and cannot be changed.",
        409,
      );
    }

    const updatedMembership: OrganizationMembership = {
      ...membership,
      role: payload.role,
      updatedAt: now,
    };

    if (payload.operation === "activate") {
      if (membership.status === "active") {
        createSetupError(
          "organization-membership-already-active",
          "This membership is already active.",
          409,
        );
      }

      if (!verifiedUid) {
        createSetupError(
          "organization-membership-uid-required",
          "A verified Firebase user is required before activation.",
          400,
        );
      }

      if (
        memberships.some(
          (candidate) =>
            candidate.id !== membership.id &&
            candidate.uid === verifiedUid &&
            candidate.status !== "removed",
        )
      ) {
        createSetupError(
          "organization-membership-uid-exists",
          "That Firebase user already has a current membership in this organization.",
          409,
        );
      }

      updatedMembership.acceptedAt = membership.acceptedAt ?? now;
      updatedMembership.status = "active";
      updatedMembership.uid = verifiedUid;
      delete updatedMembership.suspendedAt;
      delete updatedMembership.suspendedByUid;
    } else if (payload.operation === "suspend") {
      if (membership.status !== "active") {
        createSetupError(
          "organization-membership-not-active",
          "Only an active membership can be suspended.",
          409,
        );
      }

      updatedMembership.status = "suspended";
      updatedMembership.suspendedAt = now;
      updatedMembership.suspendedByUid = scope.session.user.id;
    } else if (payload.operation === "remove") {
      updatedMembership.removedAt = now;
      updatedMembership.removedByUid = scope.session.user.id;
      updatedMembership.status = "removed";
    }

    assertMembershipContinuity(
      memberships,
      membership,
      updatedMembership,
      scope.session.user.id,
    );

    transaction.set(
      "organizationMemberships",
      updatedMembership.id,
      updatedMembership,
    );

    return updatedMembership;
  });

  console.info("Organization membership lifecycle updated.", {
    membershipId: nextMembership.id,
    operation: payload.operation,
    organizationId,
    role: nextMembership.role,
    status: nextMembership.status,
  });

  return {
    id: nextMembership.id,
    message: `Membership ${nextMembership.status}: ${nextMembership.email}`,
    source: "firestore",
  };
}

async function createProvisionedWorkspace(
  scope: AdminOrganizationScope,
  payload: {
    division?: string;
    name: string;
    season?: string;
    workspaceType: OrganizationWorkspaceType;
  },
): Promise<AdminSetupResult> {
  const session = scope.session;
  const name = normalizeText(payload.name);
  const workspaceType =
    payload.workspaceType === "single_team" ? "single_team" : "organization";
  const division = normalizeText(payload.division);
  const season = normalizeText(payload.season);

  if (!name) {
    createSetupError(
      "invalid-organization",
      workspaceType === "single_team"
        ? "Team name is required."
        : "Organization name is required.",
      400,
    );
  }

  if (workspaceType === "single_team" && (!division || !season)) {
    createSetupError(
      "invalid-single-team-workspace",
      "Team name, division, and season are required.",
      400,
    );
  }

  const organizationId = await getAvailableOrganizationId(name);
  const now = new Date().toISOString();
  const teamId =
    workspaceType === "single_team"
      ? createLiveRecordId("team", [organizationId, name, season])
      : undefined;
  const team: Team | undefined = teamId
    ? {
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
        status: "active",
        teamId,
        updatedAt: now,
      }
    : undefined;
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
      teams: team ? [team] : [],
    }),
    updatedAt: now,
    workspaceType,
  };
  const membership: OrganizationMembership = {
    acceptedAt: now,
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
    const [existingOrganization, existingMembership, existingTeam] =
      await Promise.all([
      transaction.get<Organization>("organizations", organization.id),
      transaction.get<OrganizationMembership>(
        "organizationMemberships",
        membership.id,
      ),
      team
        ? transaction.get<Team>("teams", team.id)
        : Promise.resolve(null),
    ]);

    if (existingOrganization || existingMembership || existingTeam) {
      createSetupError(
        "organization-id-unavailable",
        "Choose a more specific workspace name.",
        409,
      );
    }

    transaction.create("organizations", organization.id, organization);
    transaction.create(
      "organizationMemberships",
      membership.id,
      membership,
    );

    if (team) {
      transaction.create("teams", team.id, team);
    }
  });

  console.info("Admin workspace provisioned.", {
    membershipId: membership.id,
    organizationId,
    teamId,
    uid: session.user.id,
    workspaceType,
  });

  return {
    id: organization.id,
    message:
      workspaceType === "single_team"
        ? `Individual team workspace created: ${organization.name}`
        : `Organization created: ${organization.name}`,
    source: "firestore",
    teamId,
    workspaceType,
  };
}

async function createProvisionedOrganization(
  scope: AdminOrganizationScope,
  payload: Extract<
    AdminSetupPayload,
    { actionType: "organization-provisioning" }
  >,
) {
  return createProvisionedWorkspace(scope, {
    name: payload.name,
    workspaceType: "organization",
  });
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
    workspaceType: currentOrganization?.workspaceType ?? "organization",
  };
  const actor = getAdminActor(scope);

  if (currentOrganization) {
    await repositories.organizations.update(organizationId, organization, {
      actor,
      reason: "Admin updated organization setup.",
    });
  } else {
    const membership: OrganizationMembership = {
      acceptedAt: now,
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

async function archiveOrganization(
  scope: AdminOrganizationScope,
  payload: Extract<AdminSetupPayload, { actionType: "organization-archive" }>,
): Promise<AdminSetupResult> {
  const organizationId = normalizeText(payload.organizationId);

  if (!organizationId) {
    createSetupError(
      "organization-required",
      "Choose an organization to remove.",
      400,
    );
  }

  assertManagedOrganization(scope, organizationId);

  const now = new Date().toISOString();
  const archivedOrganization = await runFirestoreTransaction(
    async (transaction) => {
      const [
        organization,
        teams,
        events,
        coachAssignments,
        registrationInvites,
      ] = await Promise.all([
        transaction.get<Organization>("organizations", organizationId),
        transaction.list<Team>("teams", { scope: { organizationId } }),
        transaction.list<GameDayEvent>("events", { scope: { organizationId } }),
        transaction.list<CoachAssignment>("coachAssignments", {
          scope: { organizationId },
        }),
        transaction.list<RegistrationInvite>(
          "registrationInvites",
          { scope: { organizationId } },
          "inviteCode",
        ),
      ]);

      if (!organization) {
        createSetupError(
          "organization-not-found",
          "Organization not found.",
          404,
        );
      }

      const nextOrganization: Organization = {
        ...organization,
        archivedAt: organization.archivedAt ?? now,
        archivedByUid: organization.archivedByUid ?? scope.session.user.id,
        lifecycleStatus: "archived",
        status: {
          activeTeams: 0,
          coaches: 0,
          registeredPlayers: organization.status.registeredPlayers,
          upcomingEvents: 0,
        },
        updatedAt: now,
      };

      transaction.set("organizations", organization.id, nextOrganization);

      teams
        .filter((team) => getTeamLifecycleStatus(team) !== "archived")
        .forEach((team) => {
          transaction.set("teams", team.id, {
            ...team,
            archivedAt: team.archivedAt ?? now,
            archivedByUid: team.archivedByUid ?? scope.session.user.id,
            status: "archived",
            updatedAt: now,
          });
        });

      events
        .filter((event) => event.status !== "archived")
        .forEach((event) => {
          transaction.set("events", event.id, {
            ...event,
            archivedAt: event.archivedAt ?? now,
            archivedByUid: event.archivedByUid ?? scope.session.user.id,
            status: "archived",
            updatedAt: now,
          });
        });

      coachAssignments
        .filter((assignment) => assignment.status !== "archived")
        .forEach((assignment) => {
          transaction.set("coachAssignments", assignment.id, {
            ...assignment,
            archivedAt: assignment.archivedAt ?? now,
            archivedByUid: assignment.archivedByUid ?? scope.session.user.id,
            status: "archived",
            updatedAt: now,
          });
        });

      registrationInvites
        .filter((invite) => normalizeRegistrationInvite(invite)?.status !== "archived")
        .forEach((invite) => {
          const normalizedInvite = normalizeRegistrationInvite(invite);

          if (!normalizedInvite) {
            return;
          }

          transaction.set("registrationInvites", normalizedInvite.inviteCode, {
            ...normalizedInvite,
            archivedAt: normalizedInvite.archivedAt ?? now,
            archivedByUid:
              normalizedInvite.archivedByUid ?? scope.session.user.id,
            status: "archived",
            updatedAt: now,
            updatedByUid: scope.session.user.id,
          });
        });

      return nextOrganization;
    },
  );

  console.info("Organization archived.", {
    organizationId: archivedOrganization.id,
  });

  return {
    id: archivedOrganization.id,
    message: `Organization removed: ${archivedOrganization.name}. Historical records were preserved.`,
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
    const [organization, existingTeam, organizationTeams] = await Promise.all([
      transaction.get<Organization>("organizations", organizationId),
      transaction.get<Team>("teams", team.id),
      transaction.list<Team>("teams", { scope: { organizationId } }),
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

    if (
      organization.workspaceType === "single_team" &&
      organizationTeams.length > 0
    ) {
      createSetupError(
        "single-team-workspace-team-exists",
        "This individual team workspace already has its team.",
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
    requireOrganizationScope:
      payload.actionType !== "organization-provisioning" &&
      payload.actionType !== "workspace-provisioning",
  });

  if (payload.actionType === "organization-provisioning") {
    return createProvisionedOrganization(scope, payload);
  }

  if (payload.actionType === "workspace-provisioning") {
    return createProvisionedWorkspace(scope, payload);
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

  if (payload.actionType === "organization-membership-invite") {
    return inviteOrganizationMembership(scope, payload);
  }

  if (payload.actionType === "organization-membership-update") {
    return updateOrganizationMembership(scope, payload);
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
