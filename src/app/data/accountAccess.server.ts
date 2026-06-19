import type { AuthSession } from "../infrastructure/auth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  canAccessAdmin,
  resolveAdminOrganizationScope,
} from "./adminOrganizationScope.server";
import {
  getCoachAssignedTeams,
  resolveCoachAssignmentScope,
} from "./coachAssignments.server";
import { getLiveParentId, getLiveParentUid } from "./liveIdentity";
import { isArchivedOrganization, type Organization } from "./organizations";
import type { Registration } from "./registrations";

export type AccountAccessOptionKind =
  | "admin"
  | "coach"
  | "join"
  | "parent"
  | "start";

export type AccountAccessOption = {
  badge?: string;
  description: string;
  href: string;
  id: string;
  kind: AccountAccessOptionKind;
  title: string;
};

export type AccountAccessReadModel = {
  autoRoute?: string;
  displayName: string;
  email?: string;
  hasEstablishedContext: boolean;
  options: AccountAccessOption[];
};

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function getDisplayName(session: AuthSession) {
  return (
    session.user.displayName ??
    session.user.email?.split("@")[0] ??
    "GameDay Account"
  );
}

async function getParentOwnedRegistrations(session: AuthSession) {
  const repositories = createFirestoreRepositories();
  const parentId = getLiveParentId(session);
  const parentUid = getLiveParentUid(session);
  const registrationLists = await Promise.all([
    parentId ? repositories.registrations.listByParentId(parentId) : [],
    parentUid
      ? repositories.registrations.list({ scope: { parentUid } })
      : [],
    parentUid
      ? repositories.registrations.list({ scope: { ownerUid: parentUid } })
      : [],
  ]);

  return uniqueById(
    registrationLists
      .flat()
      .filter((registration): registration is Registration =>
        Boolean(registration),
      ),
  );
}

export async function getAccountAccessReadModel(
  session: AuthSession,
): Promise<AccountAccessReadModel> {
  const repositories = createFirestoreRepositories();
  const [adminScope, coachScope, parentRegistrations, accountMemberships] =
    await Promise.all([
      resolveAdminOrganizationScope(session),
      resolveCoachAssignmentScope(session),
      getParentOwnedRegistrations(session),
      repositories.organizationMemberships.listByUid(session.user.id),
    ]);
  const adminCanOpen = canAccessAdmin(adminScope);
  const activeCoachMemberships = accountMemberships.filter(
    (membership) =>
      membership.status === "active" && membership.role === "coach",
  );
  const [adminOrganizations, coachTeams, coachMemberOrganizations] =
    await Promise.all([
      adminCanOpen
        ? Promise.all(
            adminScope.organizationIds.map((organizationId) =>
              repositories.organizations.getById(organizationId),
            ),
          )
        : [],
      getCoachAssignedTeams(coachScope),
      Promise.all(
        activeCoachMemberships.map((membership) =>
          repositories.organizations.getById(membership.organizationId),
        ),
      ),
    ]);
  const activeAdminOrganizations = adminOrganizations
    .filter((organization): organization is Organization =>
      Boolean(organization),
    )
    .filter((organization) => !isArchivedOrganization(organization));
  const options: AccountAccessOption[] = [];

  if (adminCanOpen) {
    options.push({
      badge:
        activeAdminOrganizations.length > 0
          ? `${activeAdminOrganizations.length} workspace${
              activeAdminOrganizations.length === 1 ? "" : "s"
            }`
          : "Setup",
      description:
        activeAdminOrganizations.length > 0
          ? "Open organization and team management."
          : "Create or finish an organization workspace.",
      href: "/admin",
      id: "admin",
      kind: "admin",
      title:
        activeAdminOrganizations.length === 1
          ? (activeAdminOrganizations[0]?.name ?? "Admin workspace")
          : "Admin workspaces",
    });
  }

  if (coachTeams.length > 0) {
    options.push({
      badge: `${coachTeams.length} team${coachTeams.length === 1 ? "" : "s"}`,
      description: "Open roster, schedule, attendance, and parent context.",
      href: "/coach",
      id: "coach",
      kind: "coach",
      title: coachTeams.length === 1 ? coachTeams[0].name : "Coach teams",
    });
  }

  if (coachTeams.length === 0 && activeCoachMemberships.length > 0) {
    const activeCoachOrganizations = coachMemberOrganizations
      .filter((organization): organization is Organization =>
        Boolean(organization),
      )
      .filter((organization) => !isArchivedOrganization(organization));

    options.push({
      badge: "Waiting assignment",
      description:
        "Your coach invite is connected. A team assignment unlocks roster and attendance.",
      href: "/coach",
      id: "coach-pending",
      kind: "coach",
      title:
        activeCoachOrganizations.length === 1
          ? `${activeCoachOrganizations[0].name} coach access`
          : "Coach access pending",
    });
  }

  if (session.claims.role === "parent" || parentRegistrations.length > 0) {
    options.push({
      badge:
        parentRegistrations.length > 0
          ? `${parentRegistrations.length} player${
              parentRegistrations.length === 1 ? "" : "s"
            }`
          : "Find team",
      description: "Open your players, schedule, alerts, and next steps.",
      href: "/parent",
      id: "parent",
      kind: "parent",
      title: "My players",
    });
  }

  const hasEstablishedContext = options.length > 0;

  if (!hasEstablishedContext) {
    options.push(
      {
        badge: "Paid org",
        description: "Create a club, league, or multi-team organization.",
        href: "/signup?intent=organization",
        id: "start-organization",
        kind: "admin",
        title: "Create organization",
      },
      {
        badge: "Free team",
        description: "Create one team workspace and invite parents.",
        href: "/signup?intent=team",
        id: "start-team",
        kind: "start",
        title: "Create single team",
      },
      {
        badge: "Free parent",
        description: "Find an open registration or use a team invite.",
        href: "/registration",
        id: "join-team",
        kind: "join",
        title: "Find a team",
      },
    );
  }

  return {
    autoRoute: hasEstablishedContext && options.length === 1
      ? options[0].href
      : undefined,
    displayName: getDisplayName(session),
    email: session.user.email,
    hasEstablishedContext,
    options,
  };
}
