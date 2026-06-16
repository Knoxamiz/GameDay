import {
  canAccessAdmin,
  resolveAdminOrganizationScope,
} from "./adminOrganizationScope.server";
import type { AuthSession } from "../infrastructure/auth";
import {
  getRoleDefinition,
  type AuthSessionRole,
} from "../infrastructure/auth";

export async function resolveSessionAccessRole(
  session: AuthSession,
): Promise<AuthSessionRole> {
  const adminScope = await resolveAdminOrganizationScope(session);

  return canAccessAdmin(adminScope) ? "admin" : session.claims.role;
}

export async function getLandingRouteForSession(
  session: AuthSession,
  resolvedRole?: AuthSessionRole,
) {
  const role = resolvedRole ?? (await resolveSessionAccessRole(session));

  if (role === "authenticated") {
    return "/login";
  }

  if (role === "admin") {
    return "/admin";
  }

  return getRoleDefinition(role).landingRoute;
}
