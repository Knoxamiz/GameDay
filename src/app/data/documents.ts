export type DocumentRequirementStatus =
  | "Missing"
  | "Submitted"
  | "Uploaded"
  | "Approved"
  | "Waived"
  | "Rejected";

export type DocumentRequirementTemplate = {
  description: string;
  label: string;
  required: boolean;
};

export type DocumentRequirement = DocumentRequirementTemplate & {
  athleteId: string;
  id: string;
  organizationId: string;
  parentId: string;
  registrationId: string;
  status: DocumentRequirementStatus;
  teamId: string;
};

export type DocumentRequirementSummary = {
  approved: number;
  blocked: number;
  missing: number;
  needsReview: number;
  open: number;
  waived: number;
};

export const documentRequirementStatusValues: DocumentRequirementStatus[] = [
  "Missing",
  "Submitted",
  "Uploaded",
  "Approved",
  "Waived",
  "Rejected",
];

export const documentRequirementTemplates: DocumentRequirementTemplate[] = [
  {
    description: "Proof of age for team eligibility.",
    label: "Birth Certificate",
    required: true,
  },
  {
    description: "Parent/guardian participation waiver.",
    label: "Waiver",
    required: true,
  },
  {
    description: "Player photo for roster verification.",
    label: "Photo",
    required: true,
  },
  {
    description: "Current physical or health clearance.",
    label: "Physical",
    required: true,
  },
];

function createDocumentRequirement(
  registrationId: string,
  athleteId: string,
  parentId: string,
  teamId: string,
  label: string,
  status: DocumentRequirementStatus,
): DocumentRequirement {
  const template =
    documentRequirementTemplates.find((requirement) => requirement.label === label) ??
    documentRequirementTemplates[0];

  return {
    ...template,
    athleteId,
    id: `${registrationId}-${label.toLowerCase().replaceAll(" ", "-")}`,
    label,
    organizationId: "black-diamonds",
    parentId,
    registrationId,
    status,
    teamId,
  };
}

export const documentRequirements: DocumentRequirement[] = [
  createDocumentRequirement(
    "registration-emma-smith",
    "emma-smith",
    "jennifer-smith",
    "black-diamonds-12u",
    "Birth Certificate",
    "Approved",
  ),
  createDocumentRequirement(
    "registration-emma-smith",
    "emma-smith",
    "jennifer-smith",
    "black-diamonds-12u",
    "Waiver",
    "Approved",
  ),
  createDocumentRequirement(
    "registration-emma-smith",
    "emma-smith",
    "jennifer-smith",
    "black-diamonds-12u",
    "Photo",
    "Uploaded",
  ),
  createDocumentRequirement(
    "registration-emma-smith",
    "emma-smith",
    "jennifer-smith",
    "black-diamonds-12u",
    "Physical",
    "Missing",
  ),
  createDocumentRequirement(
    "registration-olivia-smith",
    "olivia-smith",
    "jennifer-smith",
    "black-diamonds-10u",
    "Birth Certificate",
    "Approved",
  ),
  createDocumentRequirement(
    "registration-olivia-smith",
    "olivia-smith",
    "jennifer-smith",
    "black-diamonds-10u",
    "Waiver",
    "Missing",
  ),
  createDocumentRequirement(
    "registration-olivia-smith",
    "olivia-smith",
    "jennifer-smith",
    "black-diamonds-10u",
    "Photo",
    "Uploaded",
  ),
  createDocumentRequirement(
    "registration-olivia-smith",
    "olivia-smith",
    "jennifer-smith",
    "black-diamonds-10u",
    "Physical",
    "Approved",
  ),
  ...["Birth Certificate", "Waiver", "Photo", "Physical"].map((label) =>
    createDocumentRequirement(
      "registration-mason-smith",
      "mason-smith",
      "jennifer-smith",
      "black-diamonds-hs",
      label,
      "Missing",
    ),
  ),
  createDocumentRequirement(
    "registration-sarah-jones",
    "sarah-jones",
    "sarah-jones-parent",
    "black-diamonds-12u",
    "Birth Certificate",
    "Uploaded",
  ),
  createDocumentRequirement(
    "registration-sarah-jones",
    "sarah-jones",
    "sarah-jones-parent",
    "black-diamonds-12u",
    "Waiver",
    "Submitted",
  ),
  createDocumentRequirement(
    "registration-sarah-jones",
    "sarah-jones",
    "sarah-jones-parent",
    "black-diamonds-12u",
    "Physical",
    "Missing",
  ),
  createDocumentRequirement(
    "registration-katie-brown",
    "katie-brown",
    "katie-brown-parent",
    "black-diamonds-12u",
    "Birth Certificate",
    "Approved",
  ),
  createDocumentRequirement(
    "registration-katie-brown",
    "katie-brown",
    "katie-brown-parent",
    "black-diamonds-12u",
    "Waiver",
    "Approved",
  ),
  createDocumentRequirement(
    "registration-katie-brown",
    "katie-brown",
    "katie-brown-parent",
    "black-diamonds-12u",
    "Physical",
    "Waived",
  ),
];

export function isDocumentMissing(requirement: DocumentRequirement) {
  return requirement.status === "Missing";
}

export function isDocumentNeedsReview(requirement: DocumentRequirement) {
  return requirement.status === "Submitted" || requirement.status === "Uploaded";
}

export function isDocumentCleared(requirement: DocumentRequirement) {
  return requirement.status === "Approved" || requirement.status === "Waived";
}

export function isDocumentBlocked(requirement: DocumentRequirement) {
  return requirement.status === "Rejected";
}

export function isDocumentOpen(requirement: DocumentRequirement) {
  return (
    isDocumentMissing(requirement) ||
    isDocumentNeedsReview(requirement) ||
    isDocumentBlocked(requirement)
  );
}

export function summarizeDocumentRequirements(
  requirements: DocumentRequirement[],
): DocumentRequirementSummary {
  return requirements.reduce<DocumentRequirementSummary>(
    (summary, requirement) => {
      if (isDocumentMissing(requirement)) {
        summary.missing += 1;
      }

      if (isDocumentNeedsReview(requirement)) {
        summary.needsReview += 1;
      }

      if (requirement.status === "Approved") {
        summary.approved += 1;
      }

      if (requirement.status === "Waived") {
        summary.waived += 1;
      }

      if (isDocumentBlocked(requirement)) {
        summary.blocked += 1;
      }

      if (isDocumentOpen(requirement)) {
        summary.open += 1;
      }

      return summary;
    },
    {
      approved: 0,
      blocked: 0,
      missing: 0,
      needsReview: 0,
      open: 0,
      waived: 0,
    },
  );
}

export function getDocumentRequirementsByRegistrationId(registrationId: string) {
  return documentRequirements.filter(
    (requirement) => requirement.registrationId === registrationId,
  );
}

export function getDocumentRequirementsByRegistrationIds(
  registrationIds: string[],
) {
  const registrationIdSet = new Set(registrationIds);

  return documentRequirements.filter((requirement) =>
    registrationIdSet.has(requirement.registrationId),
  );
}

export function getDocumentRequirementsByTeamId(teamId: string) {
  return documentRequirements.filter((requirement) => requirement.teamId === teamId);
}

export function getDocumentRequirementsByOrganizationId(organizationId: string) {
  return documentRequirements.filter(
    (requirement) => requirement.organizationId === organizationId,
  );
}
