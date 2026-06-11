import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import type { Organization } from "./organizations";
import type { Team } from "./teams";
import type { RegistrationInvite } from "./invites";

export type RegistrationInviteReadModel = {
  invite?: RegistrationInvite;
  organization?: Organization;
  source: "empty" | "firestore";
  team?: Team;
};

const emptyOrganizationStatus = {
  activeTeams: 0,
  coaches: 0,
  registeredPlayers: 0,
  upcomingEvents: 0,
};

function getOrganizationShell(organizationId: string): Organization {
  return {
    id: organizationId,
    name: organizationId,
    organizationId,
    status: emptyOrganizationStatus,
  };
}

function normalizeInvite(invite: RegistrationInvite | null | undefined) {
  if (!invite || invite.status !== "Active") {
    return undefined;
  }

  return {
    ...invite,
    documentRequirements: Array.isArray(invite.documentRequirements)
      ? invite.documentRequirements
      : [],
    paymentRequirements: Array.isArray(invite.paymentRequirements)
      ? invite.paymentRequirements
      : [],
  };
}

async function buildInviteReadModel(
  invite: RegistrationInvite | null | undefined,
): Promise<RegistrationInviteReadModel> {
  const activeInvite = normalizeInvite(invite);

  if (!activeInvite) {
    return { source: "empty" };
  }

  const repositories = createFirestoreRepositories();
  const [organization, team] = await Promise.all([
    repositories.organizations.getById(activeInvite.organizationId),
    repositories.teams.getById(activeInvite.teamId),
  ]);

  return {
    invite: activeInvite,
    organization:
      organization ?? getOrganizationShell(activeInvite.organizationId),
    source: "firestore",
    team: team ?? undefined,
  };
}

export async function getPrimaryRegistrationInviteReadModel(): Promise<RegistrationInviteReadModel> {
  if (!getFirebaseAdminConfig()) {
    return { source: "empty" };
  }

  try {
    const repositories = createFirestoreRepositories();
    const activeInvites = await repositories.registrationInvites.list({
      limit: 2,
      scope: { status: "Active" },
    });
    const activeInvite =
      activeInvites.length === 1 ? activeInvites[0] : undefined;

    if (activeInvites.length > 1) {
      console.warn("Multiple active registration invites found for /registration.", {
        inviteCount: activeInvites.length,
      });
    }

    return buildInviteReadModel(activeInvite);
  } catch (error) {
    console.warn("Could not load live registration invites.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return { source: "empty" };
  }
}

export async function getRegistrationInviteReadModelByCode(
  inviteCode: string,
): Promise<RegistrationInviteReadModel> {
  if (!getFirebaseAdminConfig()) {
    return { source: "empty" };
  }

  try {
    const repositories = createFirestoreRepositories();
    const invite = await repositories.registrationInvites.getByCode(inviteCode);

    return buildInviteReadModel(invite);
  } catch (error) {
    console.warn("Could not load live registration invite.", {
      inviteCode,
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return { source: "empty" };
  }
}
