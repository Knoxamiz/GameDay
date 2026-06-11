import {
  accessRoles,
  type AccessCapability,
  type AccessRole,
  type AccessRoleDefinition,
} from "../data/accessControl";

export type AuthProviderId = "firebase";

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthRoleClaims = {
  adminId?: string;
  athleteIds: string[];
  coachId?: string;
  organizationIds: string[];
  parentId?: string;
  role: AccessRole;
  teamIds: string[];
};

export type AuthenticatedUser = {
  displayName?: string;
  email?: string;
  id: string;
  phoneNumber?: string;
  providerId: AuthProviderId;
};

export type AuthSession = {
  claims: AuthRoleClaims;
  expiresAt?: string;
  issuedAt?: string;
  user: AuthenticatedUser;
};

export type AuthSessionSource = {
  authorizationHeader?: string;
  cookieHeader?: string;
};

export interface AuthProvider {
  requireSession(source: AuthSessionSource): Promise<AuthSession>;
  verifySession(source: AuthSessionSource): Promise<AuthSession | null>;
}

export interface ClientAuthAdapter {
  getCurrentSession(): Promise<AuthSession | null>;
  getCurrentUser(): Promise<AuthenticatedUser | null>;
  login(credentials: AuthCredentials): Promise<AuthSession>;
  logout(): Promise<void>;
  onSessionChanged?: (
    callback: (session: AuthSession | null) => void,
  ) => () => void;
}

export class AccessDeniedError extends Error {
  constructor(
    readonly capability: AccessCapability,
    readonly role?: AccessRole,
  ) {
    super(
      role
        ? `${role} cannot perform ${capability}`
        : `Missing capability ${capability}`,
    );
    this.name = "AccessDeniedError";
  }
}

export function getRoleDefinition(role: AccessRole): AccessRoleDefinition {
  const definition = accessRoles.find((accessRole) => accessRole.role === role);

  if (!definition) {
    throw new AccessDeniedError("manage-organization", role);
  }

  return definition;
}

export function isAccessRole(value: unknown): value is AccessRole {
  return accessRoles.some((accessRole) => accessRole.role === value);
}

function readStringArrayClaim(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function parseAuthRoleClaims(
  claims: Record<string, unknown>,
): AuthRoleClaims | null {
  const role = claims.role;

  if (!isAccessRole(role)) {
    return null;
  }

  return {
    adminId: typeof claims.adminId === "string" ? claims.adminId : undefined,
    athleteIds: readStringArrayClaim(claims.athleteIds),
    coachId: typeof claims.coachId === "string" ? claims.coachId : undefined,
    organizationIds: readStringArrayClaim(claims.organizationIds),
    parentId: typeof claims.parentId === "string" ? claims.parentId : undefined,
    role,
    teamIds: readStringArrayClaim(claims.teamIds),
  };
}

export function hasCapability(
  roleOrClaims: AccessRole | AuthRoleClaims,
  capability: AccessCapability,
) {
  const role =
    typeof roleOrClaims === "string" ? roleOrClaims : roleOrClaims.role;

  return getRoleDefinition(role).capabilities.includes(capability);
}

export function assertCapability(
  claims: AuthRoleClaims,
  capability: AccessCapability,
) {
  if (!hasCapability(claims, capability)) {
    throw new AccessDeniedError(capability, claims.role);
  }
}

export function canAccessOrganization(
  claims: AuthRoleClaims,
  organizationId: string,
) {
  return claims.organizationIds.includes(organizationId);
}

export function canAccessTeam(claims: AuthRoleClaims, teamId: string) {
  return claims.teamIds.includes(teamId);
}

export function canAccessAthlete(claims: AuthRoleClaims, athleteId: string) {
  return claims.athleteIds.includes(athleteId);
}

export function getLandingRouteForClaims(claims: AuthRoleClaims) {
  return getRoleDefinition(claims.role).landingRoute;
}
