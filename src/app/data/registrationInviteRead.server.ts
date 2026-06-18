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
import { isActiveTeam, type Team } from "./teams";

export type RegistrationInviteReadModel = {
  availability: RegistrationInviteAvailability;
  invite?: NormalizedRegistrationInvite;
  organization?: Organization;
  source: "empty" | "firestore";
  team?: Team;
};

export type PublicRegistrationInviteLookup = {
  models: RegistrationInviteReadModel[];
  query: string;
  reason:
    | "code-not-found"
    | "empty"
    | "query-too-short"
    | "searched"
    | "service-unavailable";
};

const publicRegistrationSearchResultLimit = 20;

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function normalizeLookupText(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function normalizeSearchText(value?: string | null) {
  return normalizeLookupText(value).toLowerCase();
}

function extractInviteCode(value?: string | null) {
  const normalizedValue = normalizeLookupText(value);

  if (!normalizedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(normalizedValue);
    const joinSegmentIndex = parsedUrl.pathname
      .split("/")
      .findIndex((segment) => segment.toLowerCase() === "join");

    if (joinSegmentIndex >= 0) {
      return decodeURIComponent(
        parsedUrl.pathname.split("/")[joinSegmentIndex + 1] ?? "",
      ).trim();
    }
  } catch {
    // Plain invite codes are expected here too.
  }

  return normalizedValue.replace(/^\/?join\//i, "").trim();
}

function getInviteSearchHaystack(model: RegistrationInviteReadModel) {
  return [
    model.invite?.inviteCode,
    model.invite?.code,
    model.invite?.title,
    model.invite?.description,
    model.organization?.id,
    model.organization?.name,
    model.organization?.slug,
    model.team?.id,
    model.team?.name,
    model.team?.division,
    model.team?.season,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inviteMatchesQuery(model: RegistrationInviteReadModel, query: string) {
  const tokens = normalizeSearchText(query)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 6);

  if (tokens.length === 0) {
    return false;
  }

  const haystack = getInviteSearchHaystack(model);

  return tokens.every((token) => haystack.includes(token));
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
      isActiveTeam(team),
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

export async function getPublicRegistrationInviteReadModels(): Promise<
  RegistrationInviteReadModel[]
> {
  if (!getFirebaseAdminConfig()) {
    return [];
  }

  try {
    const repositories = createFirestoreRepositories();
    const [openInvites, legacyActiveInvites] = await Promise.all([
      repositories.registrationInvites.list({ scope: { status: "open" } }),
      repositories.registrationInvites.list({ scope: { status: "Active" } }),
    ]);
    const inviteModels = await Promise.all(
      uniqueById([...openInvites, ...legacyActiveInvites]).map(
        buildInviteReadModel,
      ),
    );

    return inviteModels.filter((model) => model.availability.available);
  } catch (error) {
    console.warn("Could not load public registration invites.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });

    return [];
  }
}

export async function lookupPublicRegistrationInviteReadModels({
  code,
  query,
}: {
  code?: string | null;
  query?: string | null;
}): Promise<PublicRegistrationInviteLookup> {
  if (!getFirebaseAdminConfig()) {
    return {
      models: [],
      query: "",
      reason: "service-unavailable",
    };
  }

  const inviteCode = extractInviteCode(code);
  const searchQuery = normalizeLookupText(query);

  if (inviteCode) {
    const model = await getRegistrationInviteReadModelByCode(inviteCode);

    return {
      models: model.availability.available && model.invite ? [model] : [],
      query: inviteCode,
      reason: model.availability.available ? "searched" : "code-not-found",
    };
  }

  if (!searchQuery) {
    return {
      models: [],
      query: "",
      reason: "empty",
    };
  }

  if (normalizeSearchText(searchQuery).length < 2) {
    return {
      models: [],
      query: searchQuery,
      reason: "query-too-short",
    };
  }

  const models = await getPublicRegistrationInviteReadModels();

  return {
    models: models
      .filter((model) => inviteMatchesQuery(model, searchQuery))
      .slice(0, publicRegistrationSearchResultLimit),
    query: searchQuery,
    reason: "searched",
  };
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
