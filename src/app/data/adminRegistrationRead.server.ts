import { cookies, headers } from "next/headers";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import type { AuthSessionSource } from "../infrastructure/auth";
import {
  isAdminRoleSession,
  resolveAdminOrganizationScope,
} from "./adminOrganizationScope.server";
import {
  registrationRequirementStatusValues,
  rosterStatusValues,
  registrationStatusValues,
  type Registration,
  type RegistrationRequirementStatus,
  type RegistrationStatus,
  type RosterStatus,
} from "./registrations";
import {
  paymentRequirementStatusValues,
  type PaymentRequirementStatus,
} from "./payments";

export type AdminRegistrationReadSource = "empty" | "firestore";

export type AdminRegistrationReadModel = {
  organizationIds: string[];
  registrations: Registration[];
  source: AdminRegistrationReadSource;
};

async function getAuthSessionSource(): Promise<AuthSessionSource> {
  const [requestHeaders, requestCookies] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const cookieHeader = requestCookies
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return {
    authorizationHeader: requestHeaders.get("authorization") ?? undefined,
    cookieHeader: cookieHeader.length > 0 ? cookieHeader : undefined,
  };
}

function normalizeStatusToken(value: unknown) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[\s_-]+/g, "")
    : "";
}

function normalizeStatusValue<TStatus extends string>(
  value: unknown,
  statusValues: TStatus[],
  fallback: TStatus,
) {
  const normalizedValue = normalizeStatusToken(value);

  return (
    statusValues.find(
      (status) => normalizeStatusToken(status) === normalizedValue,
    ) ?? fallback
  );
}

function normalizeRegistrationStatus(value: unknown): RegistrationStatus {
  return normalizeStatusValue(value, registrationStatusValues, "Pending Review");
}

function normalizeRosterStatus(value: unknown): RosterStatus {
  return normalizeStatusValue(value, rosterStatusValues, "not_rostered");
}

function normalizeRegistrationRequirementStatus(
  value: unknown,
): RegistrationRequirementStatus {
  return normalizeStatusValue(value, registrationRequirementStatusValues, "Missing");
}

function normalizePaymentRequirementStatus(
  value: unknown,
): PaymentRequirementStatus {
  return normalizeStatusValue(value, paymentRequirementStatusValues, "Missing");
}

function normalizeRegistration(registration: Registration): Registration {
  const paymentRequirements = Array.isArray(registration.paymentRequirements)
    ? registration.paymentRequirements.map((requirement) => ({
        ...requirement,
        status: normalizePaymentRequirementStatus(requirement.status),
      }))
    : undefined;

  return {
    ...registration,
    paymentRequirements,
    requirements: Array.isArray(registration.requirements)
      ? registration.requirements.map((requirement) => ({
          ...requirement,
          status: normalizeRegistrationRequirementStatus(requirement.status),
        }))
      : [],
    rosterStatus: normalizeRosterStatus(registration.rosterStatus),
    status: normalizeRegistrationStatus(registration.status),
  };
}

function getEmptyAdminRegistrationReadModel(): AdminRegistrationReadModel {
  return {
    organizationIds: [],
    registrations: [],
    source: "empty",
  };
}

export async function getAdminRegistrationReadModel(): Promise<AdminRegistrationReadModel> {
  if (!getFirebaseAdminConfig()) {
    return getEmptyAdminRegistrationReadModel();
  }

  try {
    const authProvider = new FirebaseAdminAuthProvider();
    const session = await authProvider.verifySession(await getAuthSessionSource());

    if (!isAdminRoleSession(session)) {
      return getEmptyAdminRegistrationReadModel();
    }

    const repositories = createFirestoreRepositories();
    const scope = await resolveAdminOrganizationScope(session);

    if (scope.organizationIds.length === 0) {
      return getEmptyAdminRegistrationReadModel();
    }

    const registrationLists = await Promise.all(
      scope.organizationIds.map((organizationId) =>
        repositories.registrations.listByOrganizationId(organizationId),
      ),
    );
    const registrationsById = new Map<string, Registration>();

    registrationLists
      .flat()
      .map(normalizeRegistration)
      .forEach((registration) => {
        registrationsById.set(registration.id, registration);
      });

    return {
      organizationIds: scope.organizationIds,
      registrations: [...registrationsById.values()],
      source: "firestore",
    };
  } catch (error) {
    console.warn("Could not load live admin registration data.", error);
    return getEmptyAdminRegistrationReadModel();
  }
}
