import {
  hasCapability,
  type AuthSessionSource,
} from "../infrastructure/auth";
import type { AccessCapability } from "./accessControl";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import {
  canManageOrganization,
  getAdminActor,
  isAdminRoleSession,
  resolveAdminOrganizationScope,
  type AdminOrganizationScope,
} from "./adminOrganizationScope.server";
import type {
  AdminRegistrationReviewPayload,
  AdminRegistrationReviewResult,
} from "./adminRegistrationReview";
import type {
  Registration,
  RegistrationRequirement,
  RosterStatus,
} from "./registrations";

type UpdateAdminRegistrationReviewOptions = {
  activeOrganizationId?: string;
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

function getAdminNotesValue(value: unknown, currentValue?: string) {
  return normalizeText(value) || currentValue;
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
  scope: AdminOrganizationScope,
  registration: Registration,
  capability: AccessCapability,
) {
  return Boolean(
    canManageOrganization(scope, registration.organizationId) &&
      hasCapability(scope.session.claims, capability),
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

function updatePaymentRequirementStatus(
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
  let foundPaymentRequirement = false;
  const updatedPaymentRequirements = currentPaymentRequirements.map(
    (paymentRequirement) => {
      if (paymentRequirement.id !== paymentRequirementId) {
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

  return foundPaymentRequirement ? updatedPaymentRequirements : null;
}

async function assertRosterStatusAllowed(
  registration: Registration,
  rosterStatus: RosterStatus,
) {
  const repositories = createFirestoreRepositories();
  const team = await repositories.teams.getById(registration.teamId);

  if (!team || team.organizationId !== registration.organizationId) {
    createReviewError(
      "registration-team-scope-invalid",
      "This registration is not attached to a valid team in its organization.",
      400,
    );
  }

  if (rosterStatus === "rostered" && registration.status !== "Approved") {
    createReviewError(
      "registration-approval-required",
      "Approve the registration before marking the athlete rostered.",
      400,
    );
  }
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
  if (!isAdminRoleSession(session)) {
    createReviewError(
      "admin-session-required",
      "Please sign in as an admin before reviewing registrations.",
      403,
    );
  }

  const adminScope = await resolveAdminOrganizationScope(session);
  const activeOrganizationId = normalizeText(options.activeOrganizationId);

  if (
    !activeOrganizationId ||
    !canManageOrganization(adminScope, activeOrganizationId)
  ) {
    createReviewError(
      "active-organization-required",
      "Choose an organization you manage before reviewing registrations.",
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

  if (registration.organizationId !== activeOrganizationId) {
    createReviewError(
      "active-organization-mismatch",
      "This registration is outside the active organization.",
      403,
    );
  }

  const capability = getActionCapability(payload);

  if (!canAdminReviewRegistration(adminScope, registration, capability)) {
    createReviewError(
      "admin-organization-access-required",
      "This admin cannot review this registration.",
      403,
    );
  }

  const reviewedAt = new Date().toISOString();
  const reviewedBy = session.claims.adminId ?? session.user.id;
  const actor = getAdminActor(adminScope);

  if (payload.actionType === "registration-status") {
    const adminNotes = getAdminNotesValue(
      payload.adminNotes,
      registration.adminNotes,
    );
    const registrationPatch: Partial<Registration> = {
      reviewedAt,
      reviewedBy,
      status: payload.status,
      updatedAt: reviewedAt,
    };

    if (adminNotes) {
      registrationPatch.adminNotes = adminNotes;
    }

    await repositories.registrations.update(
      registrationId,
      registrationPatch,
      {
        actor,
        reason: "Admin reviewed registration status.",
      },
    );

    return {
      source: "firestore",
    };
  }

  if (payload.actionType === "roster-status") {
    await assertRosterStatusAllowed(registration, payload.rosterStatus);

    const rosterPatch: Partial<Registration> = {
      reviewedAt,
      reviewedBy,
      rosterStatus: payload.rosterStatus,
      updatedAt: reviewedAt,
    };
    const adminNotes = getAdminNotesValue(
      payload.adminNotes,
      registration.adminNotes,
    );

    if (adminNotes) {
      rosterPatch.adminNotes = adminNotes;
    }

    if (payload.rosterStatus === "rostered") {
      rosterPatch.rosteredAt = reviewedAt;
      rosterPatch.rosteredBy = reviewedBy;
    }

    await repositories.registrations.update(
      registrationId,
      rosterPatch,
      {
        actor,
        reason: "Admin updated roster status.",
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
        updatedAt: reviewedAt,
      },
      {
        actor,
        reason: "Admin reviewed registration requirement.",
      },
    );

    return {
      source: "firestore",
    };
  }

  const paymentRequirements = updatePaymentRequirementStatus(
    registration,
    payload,
    reviewedAt,
    reviewedBy,
  );

  if (!paymentRequirements) {
    createReviewError(
      "payment-requirement-not-found",
      "Could not find this payment requirement.",
      404,
    );
  }

  await repositories.registrations.update(
    registrationId,
    {
      paymentRequirements,
      reviewedAt,
      reviewedBy,
      updatedAt: reviewedAt,
    },
    {
      actor,
      reason: "Admin reviewed registration payment.",
    },
  );

  return {
    source: "firestore",
  };
}
