import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import type { PaymentRequirement } from "./payments";
import type {
  ParentPaymentRequirementUpdatePayload,
  ParentPaymentRequirementUpdateResult,
} from "./paymentRequirementUpdate";

type UpdateParentPaymentRequirementOptions = {
  sessionSource: AuthSessionSource;
};

function fallbackResult(): ParentPaymentRequirementUpdateResult {
  return {
    source: "mock",
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);

  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function updatePaymentRequirementIntent(
  paymentRequirements: PaymentRequirement[] | undefined,
  paymentRequirement: PaymentRequirement,
) {
  const currentPaymentRequirements = paymentRequirements ?? [];
  let foundPaymentRequirement = false;
  const updatedPaymentRequirements = currentPaymentRequirements.map(
    (currentPaymentRequirement) => {
      if (
        currentPaymentRequirement.id !== paymentRequirement.id &&
        currentPaymentRequirement.label !== paymentRequirement.label
      ) {
        return currentPaymentRequirement;
      }

      foundPaymentRequirement = true;

      return {
        ...currentPaymentRequirement,
        ...paymentRequirement,
      };
    },
  );

  return foundPaymentRequirement
    ? updatedPaymentRequirements
    : [...updatedPaymentRequirements, paymentRequirement];
}

export async function updateParentPaymentRequirementIntent(
  payload: ParentPaymentRequirementUpdatePayload,
  options: UpdateParentPaymentRequirementOptions,
): Promise<ParentPaymentRequirementUpdateResult> {
  if (!getFirebaseAdminConfig()) {
    return fallbackResult();
  }

  const athleteId = normalizeText(payload.athleteId);
  const label = normalizeText(payload.label);
  const organizationId = normalizeText(payload.organizationId);
  const parentId = normalizeText(payload.parentId);
  const paymentRequirementId = normalizeText(payload.paymentRequirementId);
  const registrationId = normalizeText(payload.registrationId);

  if (
    !athleteId ||
    !label ||
    !organizationId ||
    !parentId ||
    !paymentRequirementId ||
    !registrationId ||
    payload.status !== "Submitted"
  ) {
    return fallbackResult();
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(options.sessionSource);

  if (session?.claims.role !== "parent" || session.claims.parentId !== parentId) {
    return fallbackResult();
  }

  const repositories = createFirestoreRepositories();
  const registration = await repositories.registrations.getById(registrationId);

  if (
    !registration ||
    registration.athleteId !== athleteId ||
    registration.organizationId !== organizationId ||
    registration.parentId !== parentId
  ) {
    return fallbackResult();
  }

  const submittedAt = new Date().toISOString();
  const paymentRequirement: PaymentRequirement = {
    amountDue: normalizeAmount(payload.amountDue),
    amountPaid: 0,
    athleteId,
    description: normalizeText(payload.description),
    id: paymentRequirementId,
    intentRecordedAt: submittedAt,
    label,
    organizationId,
    parentId,
    registrationId,
    required: payload.required,
    status: "Submitted",
    submittedAt,
    teamId: registration.teamId,
  };

  await repositories.registrations.update(
    registrationId,
    {
      paymentRequirements: updatePaymentRequirementIntent(
        registration.paymentRequirements,
        paymentRequirement,
      ),
    },
    {
      actor: {
        athleteIds: session.claims.athleteIds,
        id: parentId,
        organizationIds: session.claims.organizationIds,
        role: session.claims.role,
        teamIds: session.claims.teamIds,
      },
      reason: "Parent recorded payment intent.",
    },
  );

  return {
    source: "firestore",
  };
}
