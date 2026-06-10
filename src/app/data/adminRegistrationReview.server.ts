import {
  hasCapability,
  type AuthSession,
  type AuthSessionSource,
} from "../infrastructure/auth";
import type { AccessCapability } from "./accessControl";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import type { PaymentRequirement } from "./payments";
import type {
  AdminRegistrationReviewPayload,
  AdminRegistrationReviewResult,
} from "./adminRegistrationReview";
import type {
  Registration,
  RegistrationRequirement,
} from "./registrations";

type UpdateAdminRegistrationReviewOptions = {
  sessionSource: AuthSessionSource;
};

export class AdminRegistrationReviewError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AdminRegistrationReviewError";
  }
}

function createReviewError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new AdminRegistrationReviewError(reason, message, status);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getActionCapability(
  payload: AdminRegistrationReviewPayload,
): AccessCapability {
  if (payload.actionType === "payment-status") {
    return "review-payments";
  }

  if (payload.actionType === "requirement-status") {
    return "review-documents";
  }

  return "review-registrations";
}

function canAdminReviewRegistration(
  session: AuthSession | null,
  registration: Registration,
  capability: AccessCapability,
) {
  return Boolean(
    session?.claims.role === "admin" &&
      session.claims.adminId &&
      session.claims.organizationIds.includes(registration.organizationId) &&
      hasCapability(session.claims, capability),
  );
}

function updateRegistrationRequirementStatus(
  requirements: RegistrationRequirement[],
  payload: Extract<
    AdminRegistrationReviewPayload,
    { actionType: "requirement-status" }
  >,
  reviewedAt: string,
  reviewedBy: string,
) {
  const requirementLabel = normalizeText(payload.requirementLabel);
  let foundRequirement = false;
  const updatedRequirements = requirements.map((requirement) => {
    if (requirement.label !== requirementLabel) {
      return requirement;
    }

    foundRequirement = true;

    return {
      ...requirement,
      adminNotes: normalizeText(payload.adminNotes) || requirement.adminNotes,
      reviewedAt,
      reviewedBy,
      status: payload.status,
    };
  });

  return foundRequirement ? updatedRequirements : null;
}

function upsertPaymentRequirementStatus(
  registration: Registration,
  payload: Extract<
    AdminRegistrationReviewPayload,
    { actionType: "payment-status" }
  >,
  reviewedAt: string,
  reviewedBy: string,
) {
  const currentPaymentRequirements = registration.paymentRequirements ?? [];
  const paymentRequirementId = normalizeText(payload.paymentRequirementId);
  const label = normalizeText(payload.label);
  let foundPaymentRequirement = false;
  const updatedPaymentRequirements = currentPaymentRequirements.map(
    (paymentRequirement) => {
      if (
        paymentRequirement.id !== paymentRequirementId &&
        paymentRequirement.label !== label
      ) {
        return paymentRequirement;
      }

      foundPaymentRequirement = true;

      return {
        ...paymentRequirement,
        adminNotes:
          normalizeText(payload.adminNotes) || paymentRequirement.adminNotes,
        amountPaid:
          payload.status === "Paid"
            ? paymentRequirement.amountDue
            : paymentRequirement.amountPaid,
        reviewedAt,
        reviewedBy,
        status: payload.status,
      };
    },
  );

  if (foundPaymentRequirement) {
    return updatedPaymentRequirements;
  }

  const paymentRequirement: PaymentRequirement = {
    adminNotes: normalizeText(payload.adminNotes) || undefined,
    amountDue: payload.amountDue,
    amountPaid: payload.status === "Paid" ? payload.amountDue : 0,
    athleteId: registration.athleteId,
    description: payload.description,
    id: paymentRequirementId,
    label,
    organizationId: registration.organizationId,
    ownerUid: registration.ownerUid,
    parentId: registration.parentId,
    parentUid: registration.parentUid,
    registrationId: registration.id,
    required: payload.required,
    reviewedAt,
    reviewedBy,
    status: payload.status,
    teamId: registration.teamId,
  };

  return [...updatedPaymentRequirements, paymentRequirement];
}

export async function updateAdminRegistrationReview(
  payload: AdminRegistrationReviewPayload,
  options: UpdateAdminRegistrationReviewOptions,
): Promise<AdminRegistrationReviewResult> {
  if (!getFirebaseAdminConfig()) {
    createReviewError(
      "firebase-unavailable",
      "Registration review is not available until Firebase is configured.",
      503,
    );
  }

  const registrationId = normalizeText(payload.registrationId);

  if (!registrationId) {
    createReviewError(
      "missing-registration-id",
      "A registration ID is required.",
      400,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider
    .verifySession(options.sessionSource)
    .catch(() => null);

  // Firestore admin writes are intentionally disabled without a verified admin session.
  if (session?.claims.role !== "admin") {
    createReviewError(
      "admin-session-required",
      "Please sign in as an admin before reviewing registrations.",
      403,
    );
  }

  const repositories = createFirestoreRepositories();
  const registration = await repositories.registrations.getById(registrationId);

  if (!registration) {
    createReviewError(
      "registration-not-found",
      "Could not find this registration.",
      404,
    );
  }

  const capability = getActionCapability(payload);

  if (!canAdminReviewRegistration(session, registration, capability)) {
    createReviewError(
      "admin-organization-access-required",
      "This admin cannot review this registration.",
      403,
    );
  }

  const reviewedAt = new Date().toISOString();
  const reviewedBy = session.claims.adminId ?? session.user.id;

  if (payload.actionType === "registration-status") {
    await repositories.registrations.update(
      registrationId,
      {
        adminNotes: normalizeText(payload.adminNotes) || registration.adminNotes,
        reviewedAt,
        reviewedBy,
        status: payload.status,
      },
      {
        actor: {
          athleteIds: session.claims.athleteIds,
          id: reviewedBy,
          organizationIds: session.claims.organizationIds,
          role: session.claims.role,
          teamIds: session.claims.teamIds,
        },
        reason: "Admin reviewed registration status.",
      },
    );

    return {
      source: "firestore",
    };
  }

  if (payload.actionType === "requirement-status") {
    const requirements = updateRegistrationRequirementStatus(
      registration.requirements,
      payload,
      reviewedAt,
      reviewedBy,
    );

    if (!requirements) {
      createReviewError(
        "requirement-not-found",
        "Could not find this registration requirement.",
        404,
      );
    }

    await repositories.registrations.update(
      registrationId,
      {
        reviewedAt,
        reviewedBy,
        requirements,
      },
      {
        actor: {
          athleteIds: session.claims.athleteIds,
          id: reviewedBy,
          organizationIds: session.claims.organizationIds,
          role: session.claims.role,
          teamIds: session.claims.teamIds,
        },
        reason: "Admin reviewed registration requirement.",
      },
    );

    return {
      source: "firestore",
    };
  }

  const paymentRequirements = upsertPaymentRequirementStatus(
    registration,
    payload,
    reviewedAt,
    reviewedBy,
  );

  await repositories.registrations.update(
    registrationId,
    {
      paymentRequirements,
      reviewedAt,
      reviewedBy,
    },
    {
      actor: {
        athleteIds: session.claims.athleteIds,
        id: reviewedBy,
        organizationIds: session.claims.organizationIds,
        role: session.claims.role,
        teamIds: session.claims.teamIds,
      },
      reason: "Admin reviewed registration payment.",
    },
  );

  return {
    source: "firestore",
  };
}
