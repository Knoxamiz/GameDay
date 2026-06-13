import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { athletes, type Athlete } from "./athletes";
import type { ParentGuardian } from "./parents";
import type { Registration } from "./registrations";

export type ParentAthleteRegistrationSource = "empty" | "firestore";

export type ParentAthleteRegistrationReadModel = {
  athletes: Athlete[];
  parent: ParentGuardian;
  registrations: Registration[];
  source: ParentAthleteRegistrationSource;
};

export type AthleteRegistrationReadModel = {
  athlete: Athlete;
  registration?: Registration;
  source: ParentAthleteRegistrationSource;
};

export type AthleteRegistrationReadOptions = {
  parentId?: string;
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
): ParentAthleteRegistrationReadModel {
  const safeParentId = parentId || "live-parent";

  return {
    athletes: [],
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
    source: "empty",
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

    return {
      athletes: firestoreAthletes,
      parent,
      registrations: firestoreRegistrations,
      source: "firestore",
    };
  } catch (error) {
    console.warn("Falling back to empty live parent data.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
    });
    return buildLiveEmptyParentReadModel(normalizedParentId);
  }
}

export async function getAthleteRegistrationReadModel(
  athleteId: string,
  options: AthleteRegistrationReadOptions = {},
): Promise<AthleteRegistrationReadModel | null> {
  const normalizedAthleteId = normalizeModelId(athleteId);
  const normalizedParentId = normalizeModelId(options.parentId ?? "");

  if (!normalizedAthleteId || !normalizedParentId) {
    return null;
  }

  if (!shouldUseFirestore()) {
    return null;
  }

  try {
    const repositories = createFirestoreRepositories();
    const athlete = await repositories.athletes.getById(normalizedAthleteId);

    if (!athlete || athlete.parentId !== normalizedParentId) {
      return null;
    }

    const registration =
      (await repositories.registrations.getById(athlete.registrationId)) ??
      (await repositories.registrations.listByParentId(normalizedParentId)).find(
        (parentRegistration) =>
          parentRegistration.athleteId === athlete.id ||
          parentRegistration.id === athlete.registrationId,
      );

    if (!registration || registration.parentId !== normalizedParentId) {
      return null;
    }

    return {
      athlete,
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
