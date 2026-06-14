import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { getCurrentParentUser } from "./currentUser.server";
import {
  getRegistrationInviteAvailability,
  normalizeRegistrationInvite,
  type NormalizedRegistrationInvite,
  type RegistrationInvite,
  type RegistrationInviteAvailability,
} from "./invites";
import type { Organization } from "./organizations";
import type { Registration } from "./registrations";
import type { Team } from "./teams";

export type RegistrationInviteReadModel = {
  availability: RegistrationInviteAvailability;
  invite?: NormalizedRegistrationInvite;
  organization?: Organization;
  source: "empty" | "firestore";
  team?: Team;
};

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

async function getInviteRegistrationCount(invite: NormalizedRegistrationInvite) {
  const repositories = createFirestoreRepositories();
  const [byInviteId, byInviteCode] = await Promise.all([
    repositories.registrations.list({
      scope: { registrationInviteId: invite.id },
    }),
    repositories.registrations.list({
      scope: { inviteCode: invite.inviteCode },
    }),
  ]);

  return uniqueById([...byInviteId, ...byInviteCode]).length;
}

async function buildInviteReadModel(
  invite: RegistrationInvite | null | undefined,
): Promise<RegistrationInviteReadModel> {
  const normalizedInvite = normalizeRegistrationInvite(invite);

  if (!normalizedInvite) {
    return {
      availability: { available: false, reason: "missing" },
      source: "empty",
    };
  }

  const repositories = createFirestoreRepositories();
  const [organization, team, registrationCount] = await Promise.all([
    repositories.organizations.getById(normalizedInvite.organizationId),
    repositories.teams.getById(normalizedInvite.teamId),
    getInviteRegistrationCount(normalizedInvite),
  ]);
  const scopeIsValid = Boolean(
    organization &&
      team &&
      team.organizationId === normalizedInvite.organizationId &&
      team.lifecycleStatus !== "Inactive",
  );

  return {
    availability: getRegistrationInviteAvailability(normalizedInvite, {
      registrationCount,
      scopeIsValid,
    }),
    invite: normalizedInvite,
    organization: organization ?? undefined,
    source: "firestore",
    team: team ?? undefined,
  };
}

export async function getParentRegistrationInviteReadModels(): Promise<
  RegistrationInviteReadModel[]
> {
  if (!getFirebaseAdminConfig()) {
    return [];
  }

  try {
    const parent = await getCurrentParentUser();

    if (parent.source !== "firebase-session" || !parent.parentUid) {
      return [];
    }

    const repositories = createFirestoreRepositories();
    const [ownedRegistrations, parentRegistrations] = await Promise.all([
      repositories.registrations.list({
        scope: { ownerUid: parent.parentUid },
      }),
      repositories.registrations.list({
        scope: { parentId: parent.parentId },
      }),
    ]);
    const registrations = uniqueById<Registration>([
      ...ownedRegistrations,
      ...parentRegistrations,
    ]);
    const teamIds = [
      ...new Set([
        ...registrations.map((registration) => registration.teamId),
      ]),
    ].filter(Boolean);
    const inviteLists = await Promise.all(
      teamIds.map((teamId) =>
        repositories.registrationInvites.listByTeamId(teamId),
      ),
    );
    const inviteModels = await Promise.all(
      uniqueById(
        inviteLists
          .flat()
          .map(normalizeRegistrationInvite)
          .filter(
            (invite): invite is NormalizedRegistrationInvite => Boolean(invite),
          ),
      ).map(buildInviteReadModel),
    );

    return inviteModels.filter((model) => model.availability.available);
  } catch (error) {
    console.warn("Could not load parent-scoped registration invites.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return [];
  }
}

export async function getRegistrationInviteReadModelByCode(
  inviteCode: string,
): Promise<RegistrationInviteReadModel> {
  if (!getFirebaseAdminConfig()) {
    return {
      availability: { available: false, reason: "service-unavailable" },
      source: "empty",
    };
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

    return {
      availability: { available: false, reason: "service-unavailable" },
      source: "empty",
    };
  }
}
