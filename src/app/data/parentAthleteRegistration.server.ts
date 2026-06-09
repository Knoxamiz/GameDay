import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  athletes,
  getAthleteById,
  getAthletesByParentId,
  type Athlete,
} from "./athletes";
import {
  currentParentId,
  getCurrentParent,
  getParentById,
  type ParentGuardian,
} from "./parents";
import {
  getRegistrationById,
  getRegistrationsByParentId,
  type Registration,
} from "./registrations";

export type ParentAthleteRegistrationSource = "firestore" | "mock";

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

function shouldUseFirestore() {
  return Boolean(getFirebaseAdminConfig());
}

function buildMockParentReadModel(
  parentId = currentParentId,
): ParentAthleteRegistrationReadModel {
  const parent = getParentById(parentId) ?? getCurrentParent();

  return {
    athletes: getAthletesByParentId(parent.id),
    parent,
    registrations: getRegistrationsByParentId(parent.id),
    source: "mock",
  };
}

function buildMockAthleteReadModel(
  athleteId: string,
): AthleteRegistrationReadModel | null {
  const athlete = getAthleteById(athleteId);

  if (!athlete) {
    return null;
  }

  return {
    athlete,
    registration: getRegistrationById(athlete.registrationId),
    source: "mock",
  };
}

export function getRegistrationByAthlete(
  athlete: Athlete,
  registrations: Registration[],
) {
  return (
    registrations.find(
      (registration) =>
        registration.id === athlete.registrationId ||
        registration.athleteId === athlete.id,
    ) ?? getRegistrationById(athlete.registrationId)
  );
}

export async function getParentAthleteRegistrationReadModel(
  parentId = currentParentId,
): Promise<ParentAthleteRegistrationReadModel> {
  if (!shouldUseFirestore()) {
    return buildMockParentReadModel(parentId);
  }

  try {
    const repositories = createFirestoreRepositories();
    const parent = await repositories.parents.getById(parentId);

    if (!parent) {
      return buildMockParentReadModel(parentId);
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
    console.warn("Falling back to mock parent data.", error);
    return buildMockParentReadModel(parentId);
  }
}

export async function getAthleteRegistrationReadModel(
  athleteId: string,
  options: AthleteRegistrationReadOptions = {},
): Promise<AthleteRegistrationReadModel | null> {
  if (!shouldUseFirestore()) {
    return buildMockAthleteReadModel(athleteId);
  }

  try {
    const repositories = createFirestoreRepositories();
    const athlete = await repositories.athletes.getById(athleteId);

    if (!athlete) {
      return buildMockAthleteReadModel(athleteId);
    }

    const registration =
      (await repositories.registrations.getById(athlete.registrationId)) ??
      (options.parentId
        ? (await repositories.registrations.listByParentId(options.parentId)).find(
            (parentRegistration) =>
              parentRegistration.athleteId === athlete.id ||
              parentRegistration.id === athlete.registrationId,
          )
        : undefined) ??
      (await repositories.registrations.listByAthleteId(athlete.id))[0];

    return {
      athlete,
      registration,
      source: "firestore",
    };
  } catch (error) {
    console.warn("Falling back to mock athlete data.", error);
    return buildMockAthleteReadModel(athleteId);
  }
}

export function getStaticAthleteParams() {
  return athletes.map((athlete) => ({
    athleteId: athlete.id,
  }));
}
