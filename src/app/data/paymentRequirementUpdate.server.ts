import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { getLiveParentId, getLiveParentUid } from "./liveIdentity";
import type { PaymentRequirement } from "./payments";
import type {
  ParentPaymentRequirementUpdatePayload,
  ParentPaymentRequirementUpdateResult,
} from "./paymentRequirementUpdate";

type UpdateParentPaymentRequirementOptions = {
  sessionSource: AuthSessionSource;
};

export class ParentPaymentRequirementError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ParentPaymentRequirementError";
  }
}

function createPaymentError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new ParentPaymentRequirementError(reason, message, status);
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
  const hasPaymentRequirement = currentPaymentRequirements.some(
    (currentPaymentRequirement) =>
      currentPaymentRequirement.id === paymentRequirement.id,
  );

  if (!hasPaymentRequirement) {
    return null;
  }

  return currentPaymentRequirements.map(
    (currentPaymentRequirement) => {
      if (currentPaymentRequirement.id !== paymentRequirement.id) {
        return currentPaymentRequirement;
      }

      return {
        ...currentPaymentRequirement,
        ...paymentRequirement,
      };
    },
  );
}

export async function updateParentPaymentRequirementIntent(
  payload: ParentPaymentRequirementUpdatePayload,
  options: UpdateParentPaymentRequirementOptions,
): Promise<ParentPaymentRequirementUpdateResult> {
  if (!getFirebaseAdminConfig()) {
    createPaymentError(
      "firebase-unavailable",
      "Payment intent updates are not available until Firebase is configured.",
      503,
    );
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
    createPaymentError(
      "invalid-payment-intent",
      "Could not record this payment intent.",
      400,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider
    .verifySession(options.sessionSource)
    .catch(() => null);
  const liveParentId = getLiveParentId(session);
  const parentUid = getLiveParentUid(session);

  if (
    !session ||
    session.claims.role !== "parent" ||
    !liveParentId ||
    !parentUid ||
    liveParentId !== parentId
  ) {
    createPaymentError(
      "parent-session-required",
      "Please sign in as the parent owner before recording payment.",
      403,
    );
  }

  const repositories = createFirestoreRepositories();
  const registration = await repositories.registrations.getById(registrationId);

  if (
    !registration ||
    registration.athleteId !== athleteId ||
    registration.organizationId !== organizationId ||
    registration.parentId !== parentId
  ) {
    createPaymentError(
      "registration-not-found",
      "Could not find a registration owned by this parent.",
      404,
    );
  }

  const currentPaymentRequirement = registration.paymentRequirements?.find(
    (requirement) => requirement.id === paymentRequirementId,
  );

  if (!currentPaymentRequirement) {
    createPaymentError(
      "payment-requirement-not-found",
      "Could not find this payment requirement.",
      404,
    );
  }

  if (
    currentPaymentRequirement.label !== label ||
    currentPaymentRequirement.status === "Paid" ||
    currentPaymentRequirement.status === "Waived"
  ) {
    createPaymentError(
      "payment-requirement-not-open",
      "This payment requirement is not open for resubmission.",
      409,
    );
  }

  const submittedAt = new Date().toISOString();
  const paymentRequirement: PaymentRequirement = {
    ...currentPaymentRequirement,
    amountDue: normalizeAmount(currentPaymentRequirement.amountDue),
    amountPaid: 0,
    athleteId,
    createdAt: currentPaymentRequirement.createdAt ?? submittedAt,
    createdByUid: currentPaymentRequirement.createdByUid ?? parentUid,
    description: currentPaymentRequirement.description,
    id: currentPaymentRequirement.id,
    intentRecordedAt: submittedAt,
    label: currentPaymentRequirement.label,
    organizationId,
    ownerUid: parentUid,
    parentId,
    parentUid,
    registrationId,
    required: currentPaymentRequirement.required,
    status: "Submitted",
    submittedAt,
    teamId: registration.teamId,
    updatedAt: submittedAt,
  };
  const paymentRequirements = updatePaymentRequirementIntent(
    registration.paymentRequirements,
    paymentRequirement,
  );

  if (!paymentRequirements) {
    createPaymentError(
      "payment-requirement-not-found",
      "Could not find this payment requirement.",
      404,
    );
  }

  await repositories.registrations.update(
    registrationId,
    {
      paymentRequirements,
      updatedAt: submittedAt,
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
