export type PaymentRequirementStatus =
  | "Missing"
  | "Submitted"
  | "Paid"
  | "Waived"
  | "Rejected";

export type PaymentRequirementTemplate = {
  amountDue: number;
  description: string;
  label: string;
  required: boolean;
};

export type PaymentRequirement = PaymentRequirementTemplate & {
  adminNotes?: string;
  amountPaid: number;
  athleteId: string;
  createdAt?: string;
  createdByUid?: string;
  id: string;
  intentRecordedAt?: string;
  organizationId: string;
  parentId: string;
  parentUid?: string;
  ownerUid?: string;
  registrationId: string;
  reviewedAt?: string;
  reviewedBy?: string;
  submittedAt?: string;
  status: PaymentRequirementStatus;
  teamId: string;
  updatedAt?: string;
};

export type PaymentRequirementSummary = {
  blocked: number;
  missing: number;
  needsReview: number;
  open: number;
  paid: number;
  totalDue: number;
  totalPaid: number;
  waived: number;
};

export const paymentRequirementStatusValues: PaymentRequirementStatus[] = [
  "Missing",
  "Submitted",
  "Paid",
  "Waived",
  "Rejected",
];

export const paymentRequirementTemplates: PaymentRequirementTemplate[] = [
  {
    amountDue: 125,
    description: "Season registration fee. Admin can waive when appropriate.",
    label: "Registration Fee",
    required: true,
  },
];

export const paymentRequirements: PaymentRequirement[] = [];

export function isPaymentMissing(requirement: PaymentRequirement) {
  return requirement.status === "Missing";
}

export function isPaymentNeedsReview(requirement: PaymentRequirement) {
  return requirement.status === "Submitted";
}

export function isPaymentCleared(requirement: PaymentRequirement) {
  return requirement.status === "Paid" || requirement.status === "Waived";
}

export function isPaymentBlocked(requirement: PaymentRequirement) {
  return requirement.status === "Rejected";
}

export function isPaymentOpen(requirement: PaymentRequirement) {
  return (
    isPaymentMissing(requirement) ||
    isPaymentNeedsReview(requirement) ||
    isPaymentBlocked(requirement)
  );
}

export function summarizePaymentRequirements(
  requirements: PaymentRequirement[],
): PaymentRequirementSummary {
  return requirements.reduce<PaymentRequirementSummary>(
    (summary, requirement) => {
      if (requirement.required && !isPaymentCleared(requirement)) {
        summary.totalDue += requirement.amountDue;
      }

      summary.totalPaid += requirement.amountPaid;

      if (isPaymentMissing(requirement)) {
        summary.missing += 1;
      }

      if (isPaymentNeedsReview(requirement)) {
        summary.needsReview += 1;
      }

      if (requirement.status === "Paid") {
        summary.paid += 1;
      }

      if (requirement.status === "Waived") {
        summary.waived += 1;
      }

      if (isPaymentBlocked(requirement)) {
        summary.blocked += 1;
      }

      if (isPaymentOpen(requirement)) {
        summary.open += 1;
      }

      return summary;
    },
    {
      blocked: 0,
      missing: 0,
      needsReview: 0,
      open: 0,
      paid: 0,
      totalDue: 0,
      totalPaid: 0,
      waived: 0,
    },
  );
}

export function getPaymentRequirementsByRegistrationId(registrationId: string) {
  return paymentRequirements.filter(
    (requirement) => requirement.registrationId === registrationId,
  );
}

export function getPaymentRequirementsByRegistrationIds(registrationIds: string[]) {
  const registrationIdSet = new Set(registrationIds);

  return paymentRequirements.filter((requirement) =>
    registrationIdSet.has(requirement.registrationId),
  );
}

export function getPaymentRequirementsByTeamId(teamId: string) {
  return paymentRequirements.filter((requirement) => requirement.teamId === teamId);
}

export function getPaymentRequirementsByOrganizationId(organizationId: string) {
  return paymentRequirements.filter(
    (requirement) => requirement.organizationId === organizationId,
  );
}
