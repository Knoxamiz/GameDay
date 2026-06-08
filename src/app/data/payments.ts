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
  amountPaid: number;
  athleteId: string;
  id: string;
  organizationId: string;
  parentId: string;
  registrationId: string;
  status: PaymentRequirementStatus;
  teamId: string;
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

function createPaymentRequirement(
  registrationId: string,
  athleteId: string,
  parentId: string,
  teamId: string,
  status: PaymentRequirementStatus,
  amountPaid = 0,
): PaymentRequirement {
  const template = paymentRequirementTemplates[0];

  return {
    ...template,
    amountPaid,
    athleteId,
    id: `${registrationId}-registration-fee`,
    organizationId: "black-diamonds",
    parentId,
    registrationId,
    status,
    teamId,
  };
}

export const paymentRequirements: PaymentRequirement[] = [
  createPaymentRequirement(
    "registration-emma-smith",
    "emma-smith",
    "jennifer-smith",
    "black-diamonds-12u",
    "Missing",
  ),
  createPaymentRequirement(
    "registration-olivia-smith",
    "olivia-smith",
    "jennifer-smith",
    "black-diamonds-10u",
    "Submitted",
    125,
  ),
  createPaymentRequirement(
    "registration-mason-smith",
    "mason-smith",
    "jennifer-smith",
    "black-diamonds-hs",
    "Missing",
  ),
  createPaymentRequirement(
    "registration-sarah-jones",
    "sarah-jones",
    "sarah-jones-parent",
    "black-diamonds-12u",
    "Submitted",
    125,
  ),
  createPaymentRequirement(
    "registration-katie-brown",
    "katie-brown",
    "katie-brown-parent",
    "black-diamonds-12u",
    "Paid",
    125,
  ),
];

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
