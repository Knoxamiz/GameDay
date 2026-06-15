import {
  hasCapability,
  type AuthSession,
  type AuthSessionSource,
} from "../infrastructure/auth";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  canManageOrganizationMembership,
  type OrganizationMembership,
} from "./organizationMemberships";
import type { Organization } from "./organizations";

export type AdminOrganizationScopeSource =
  | "claims"
  | "claims-and-memberships"
  | "empty"
  | "memberships";

export type AdminOrganizationScope = {
  claimOrganizationIds: string[];
  membershipOrganizationIds: string[];
  memberships: OrganizationMembership[];
  organizationIds: string[];
  session: AuthSession;
  source: AdminOrganizationScopeSource;
};

export type OrganizationManagementAuthority =
  | "admin"
  | "bootstrap-admin"
  | "owner";

export type AdminRecordActor = {
  athleteIds: string[];
  id: string;
  organizationIds: string[];
  role: "admin";
  teamIds: string[];
};

export type ActiveAdminOrganizationContext = {
  activeOrganization?: Organization;
  activeOrganizationId?: string;
  organizations: Organization[];
  requiresSelection: boolean;
  scope: AdminOrganizationScope;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueStringList(values: (string | undefined)[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function getOrganizationShell(organizationId: string): Organization {
  const name = organizationId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

  return {
    id: organizationId,
    name: name || organizationId,
    organizationId,
    status: {
      activeTeams: 0,
      coaches: 0,
      registeredPlayers: 0,
      upcomingEvents: 0,
    },
  };
}

function getScopeSource(
  claimOrganizationIds: string[],
  membershipOrganizationIds: string[],
): AdminOrganizationScopeSource {
  if (claimOrganizationIds.length > 0 && membershipOrganizationIds.length > 0) {
    return "claims-and-memberships";
  }

  if (membershipOrganizationIds.length > 0) {
    return "memberships";
  }

  if (claimOrganizationIds.length > 0) {
    return "claims";
  }

  return "empty";
}

export function isAdminRoleSession(
  session: AuthSession | null,
): session is AuthSession {
  return session?.claims.role === "admin";
}

export async function verifyAdminRoleSession(source: AuthSessionSource) {
  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(source).catch(() => null);

  return isAdminRoleSession(session) ? session : null;
}

export async function resolveAdminOrganizationScope(
  session: AuthSession,
): Promise<AdminOrganizationScope> {
  const repositories = createFirestoreRepositories();
  const allMemberships =
    await repositories.organizationMemberships.listByUid(session.user.id);
  const memberships = allMemberships.filter(canManageOrganizationMembership);
  const membershipOrganizationIdSet = new Set(
    allMemberships.map((membership) => membership.organizationId),
  );
  const claimOrganizationIds = uniqueStringList(
    session.claims.organizationIds.filter(
      (organizationId) => !membershipOrganizationIdSet.has(organizationId),
    ),
  );
  const membershipOrganizationIds = uniqueStringList(
    memberships.map((membership) => membership.organizationId),
  );
  const organizationIds = uniqueStringList([
    ...claimOrganizationIds,
    ...membershipOrganizationIds,
  ]);

  return {
    claimOrganizationIds,
    membershipOrganizationIds,
    memberships,
    organizationIds,
    session,
    source: getScopeSource(claimOrganizationIds, membershipOrganizationIds),
  };
}

export function canManageOrganization(
  scope: AdminOrganizationScope,
  organizationId: string,
) {
  return scope.organizationIds.includes(organizationId);
}

export function getOrganizationManagementAuthority(
  scope: AdminOrganizationScope,
  organizationId: string,
): OrganizationManagementAuthority | null {
  const membership = scope.memberships.find(
    (candidate) => candidate.organizationId === organizationId,
  );

  if (membership?.role === "owner" || membership?.role === "admin") {
    return membership.role;
  }

  return scope.claimOrganizationIds.includes(organizationId)
    ? "bootstrap-admin"
    : null;
}

export async function resolveActiveAdminOrganizationContext(
  session: AuthSession,
  requestedOrganizationId?: string,
): Promise<ActiveAdminOrganizationContext> {
  const scope = await resolveAdminOrganizationScope(session);
  const repositories = createFirestoreRepositories();
  const organizationRecords = await Promise.all(
    scope.organizationIds.map((organizationId) =>
      repositories.organizations.getById(organizationId),
    ),
  );
  const organizations = scope.organizationIds.map(
    (organizationId, index) =>
      organizationRecords[index] ?? getOrganizationShell(organizationId),
  );
  const activeOrganizationId =
    scope.organizationIds.length === 1
      ? scope.organizationIds[0]
      : requestedOrganizationId &&
          scope.organizationIds.includes(requestedOrganizationId)
        ? requestedOrganizationId
        : undefined;

  return {
    activeOrganization: organizations.find(
      (organization) => organization.id === activeOrganizationId,
    ),
    activeOrganizationId,
    organizations,
    requiresSelection:
      scope.organizationIds.length > 1 && !activeOrganizationId,
    scope,
  };
}

export function canUseAdminSetup(scope: AdminOrganizationScope) {
  return hasCapability(scope.session.claims, "manage-organization");
}

export function getAdminActor(scope: AdminOrganizationScope): AdminRecordActor {
  return {
    athleteIds: scope.session.claims.athleteIds,
    id: scope.session.claims.adminId ?? scope.session.user.id,
    organizationIds: scope.organizationIds,
    role: "admin",
    teamIds: scope.session.claims.teamIds,
  };
}
