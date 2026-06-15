import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { athletes, type Athlete } from "./athletes";
import type { ParentGuardian } from "./parents";
import type { Registration } from "./registrations";

export type ParentAthleteRegistrationSource = "empty" | "error" | "firestore";

export type ParentAthleteRegistrationReadModel = {
  athletes: Athlete[];
  errorMessage?: string;
  parent: ParentGuardian;
  registrations: Registration[];
  source: ParentAthleteRegistrationSource;
};

export type AthleteRegistrationReadModel = {
  athlete: Athlete;
  parent: ParentGuardian;
  registration?: Registration;
  source: ParentAthleteRegistrationSource;
};

export type AthleteRegistrationReadOptions = {
  parentId?: string;
  parentUid?: string;
};

export type ParentAthleteRegistrationReadOptions = {
  parentUid?: string;
};

function normalizeModelId(id: string) {
  const trimmedId = id.trim();

  return trimmedId.length > 0 ? trimmedId : null;
}

function shouldUseFirestore() {
  return Boolean(getFirebaseAdminConfig());
}

function buildLiveEmptyParentReadModel(
  parentId: string,
  options: {
    errorMessage?: string;
    source?: ParentAthleteRegistrationSource;
  } = {},
): ParentAthleteRegistrationReadModel {
  const safeParentId = parentId || "live-parent";

  return {
    athletes: [],
    errorMessage: options.errorMessage,
    parent: {
      athleteIds: [],
      email: "",
      firstName: "Parent",
      id: safeParentId,
      lastName: "",
      name: "Parent",
      organizationIds: [],
      phone: "",
    },
    registrations: [],
    source: options.source ?? "empty",
  };
}

export function getRegistrationByAthlete(
  athlete: Athlete,
  registrations: Registration[],
) {
  return registrations.find(
    (registration) =>
      registration.id === athlete.registrationId ||
      registration.athleteId === athlete.id,
  );
}

export async function getParentAthleteRegistrationReadModel(
  parentId?: string,
  options: ParentAthleteRegistrationReadOptions = {},
): Promise<ParentAthleteRegistrationReadModel> {
  if (!shouldUseFirestore()) {
    return buildLiveEmptyParentReadModel(parentId ?? "");
  }

  const normalizedParentId = normalizeModelId(parentId ?? "");

  if (!normalizedParentId) {
    return buildLiveEmptyParentReadModel("");
  }

  try {
    const repositories = createFirestoreRepositories();
    const parent = await repositories.parents.getById(normalizedParentId);

    if (!parent) {
      return buildLiveEmptyParentReadModel(normalizedParentId);
    }

    const [firestoreAthletes, firestoreRegistrations] = await Promise.all([
      repositories.athletes.listByParentId(parent.id),
      repositories.registrations.listByParentId(parent.id),
    ]);
    const normalizedParentUid = normalizeModelId(options.parentUid ?? "");
    const ownedAthletes = normalizedParentUid
      ? firestoreAthletes.filter(
          (athlete) =>
            (!athlete.ownerUid || athlete.ownerUid === normalizedParentUid) &&
            (!athlete.parentUid || athlete.parentUid === normalizedParentUid),
        )
      : firestoreAthletes;
    const ownedRegistrations = normalizedParentUid
      ? firestoreRegistrations.filter(
          (registration) =>
            (!registration.ownerUid ||
              registration.ownerUid === normalizedParentUid) &&
            (!registration.parentUid ||
              registration.parentUid === normalizedParentUid),
        )
      : firestoreRegistrations;

    return {
      athletes: ownedAthletes,
      parent,
      registrations: ownedRegistrations,
      source: "firestore",
    };
  } catch (error) {
    console.warn("Could not load live parent dashboard data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });
    return buildLiveEmptyParentReadModel(normalizedParentId, {
      errorMessage: "Could not load parent dashboard data. Please try again.",
      source: "error",
    });
  }
}

export async function getAthleteRegistrationReadModel(
  athleteId: string,
  options: AthleteRegistrationReadOptions = {},
): Promise<AthleteRegistrationReadModel | null> {
  const normalizedAthleteId = normalizeModelId(athleteId);
  const normalizedParentId = normalizeModelId(options.parentId ?? "");
  const normalizedParentUid = normalizeModelId(options.parentUid ?? "");

  if (!normalizedAthleteId || !normalizedParentId || !normalizedParentUid) {
    return null;
  }

  if (!shouldUseFirestore()) {
    return null;
  }

  try {
    const repositories = createFirestoreRepositories();
    const [athlete, parent] = await Promise.all([
      repositories.athletes.getById(normalizedAthleteId),
      repositories.parents.getById(normalizedParentId),
    ]);

    if (
      !athlete ||
      !parent ||
      athlete.parentId !== normalizedParentId ||
      (athlete.ownerUid && athlete.ownerUid !== normalizedParentUid) ||
      (athlete.parentUid && athlete.parentUid !== normalizedParentUid) ||
      (parent.ownerUid && parent.ownerUid !== normalizedParentUid) ||
      (parent.parentUid && parent.parentUid !== normalizedParentUid)
    ) {
      return null;
    }

    const registration =
      (await repositories.registrations.getById(athlete.registrationId)) ??
      (await repositories.registrations.listByParentId(normalizedParentId)).find(
        (parentRegistration) =>
          parentRegistration.athleteId === athlete.id ||
          parentRegistration.id === athlete.registrationId,
      );

    if (
      !registration ||
      registration.parentId !== normalizedParentId ||
      (registration.ownerUid &&
        registration.ownerUid !== normalizedParentUid) ||
      (registration.parentUid &&
        registration.parentUid !== normalizedParentUid)
    ) {
      return null;
    }

    return {
      athlete,
      parent,
      registration,
      source: "firestore",
    };
  } catch (error) {
    console.warn("Could not load live athlete data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });
    return null;
  }
}

export function getStaticAthleteParams() {
  return athletes.map((athlete) => ({
    athleteId: athlete.id,
  }));
}
