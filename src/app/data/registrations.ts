export type RegistrationRequirementStatus =
  | "Missing"
  | "Submitted"
  | "Uploaded"
  | "Approved"
  | "Waived"
  | "Rejected";
export type RegistrationStatus =
  | "Approved"
  | "Rejected"
  | "Incomplete"
  | "Pending"
  | "Pending Review";

export type RegistrationRequirement = {
  description?: string;
  label: string;
  required?: boolean;
  status: RegistrationRequirementStatus;
};

export type RegistrationRequirementSummary = {
  approved: number;
  blocked: number;
  missing: number;
  needsReview: number;
  open: number;
  waived: number;
};

export type Registration = {
  id: string;
  athleteId: string;
  parentId: string;
  parentName: string;
  organizationId: string;
  teamId: string;
  status: RegistrationStatus;
  details: string;
  submittedDate?: string;
  requirements: RegistrationRequirement[];
};

export type RegistrationSummary = {
  pendingRegistrations: number;
  incompleteRegistrations: number;
  rejectedRegistrations: number;
  approvedRegistrations: number;
  missingRequirements: number;
  missingPhysicals: number;
  submittedRequirements: number;
  concernCount: number;
};

export const registrationRequirementStatusValues: RegistrationRequirementStatus[] =
  ["Missing", "Submitted", "Uploaded", "Approved", "Waived", "Rejected"];

export const registrationStatusValues: RegistrationStatus[] = [
  "Approved",
  "Rejected",
  "Incomplete",
  "Pending",
  "Pending Review",
];

export const registrationAdminDecisionOptions: RegistrationStatus[] = [
  "Approved",
  "Incomplete",
  "Rejected",
];

export const registrationForm = {
  organizationId: "black-diamonds",
  parentFields: ["First Name", "Last Name", "Email", "Phone Number"],
  athleteFields: [
    "First Name",
    "Last Name",
    "Date of Birth",
    "Grade",
    "School",
    "Jersey Size",
  ],
  documents: [
    {
      label: "Birth Certificate",
      status: "Uploaded",
      tone: "complete",
      helperText: "On file.",
    },
    {
      label: "Physical Form",
      status: "Missing",
      tone: "missing",
      helperText: "Needed before approval.",
    },
  ],
  waiverLabel: "Waiver - I Agree",
  requirements: [
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
  ],
  review: {
    parentName: "Jennifer Smith",
    athleteName: "Emma Smith",
    teamLabel: "12U Girls",
    requirements: [
      "Birth Certificate Uploaded",
      "Physical Needed Before Approval",
      "Waiver Accepted",
    ],
  },
  submitted: {
    athleteName: "Emma Smith",
    teamLabel: "12U Girls",
    status: "Pending Review",
    submittedDate: "May 31, 2026",
    nextSteps: [
      "Admin reviews registration",
      "Team assignment confirmed",
      "Parent notified automatically",
    ],
  },
};

export const registrations: Registration[] = [
  {
    id: "registration-emma-smith",
    athleteId: "emma-smith",
    parentId: "jennifer-smith",
    parentName: "Jennifer Smith",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-12u",
    status: "Incomplete",
    details: "One required document still needs to be submitted.",
    submittedDate: "May 31, 2026",
    requirements: [
      {
        label: "Birth Certificate",
        required: true,
        status: "Approved",
      },
      {
        label: "Waiver",
        required: true,
        status: "Approved",
      },
      {
        label: "Photo",
        required: true,
        status: "Uploaded",
      },
      {
        label: "Physical",
        required: true,
        status: "Missing",
      },
    ],
  },
  {
    id: "registration-olivia-smith",
    athleteId: "olivia-smith",
    parentId: "jennifer-smith",
    parentName: "Jennifer Smith",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-10u",
    status: "Incomplete",
    details: "Emergency contact form still needs parent signature.",
    requirements: [
      {
        label: "Birth Certificate",
        required: true,
        status: "Approved",
      },
      {
        label: "Waiver",
        required: true,
        status: "Missing",
      },
      {
        label: "Photo",
        required: true,
        status: "Uploaded",
      },
      {
        label: "Physical",
        required: true,
        status: "Approved",
      },
    ],
  },
  {
    id: "registration-mason-smith",
    athleteId: "mason-smith",
    parentId: "jennifer-smith",
    parentName: "Jennifer Smith",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-hs",
    status: "Pending",
    details: "Season registration has not opened yet.",
    requirements: [
      {
        label: "Birth Certificate",
        required: true,
        status: "Missing",
      },
      {
        label: "Waiver",
        required: true,
        status: "Missing",
      },
      {
        label: "Photo",
        required: true,
        status: "Missing",
      },
      {
        label: "Physical",
        required: true,
        status: "Missing",
      },
    ],
  },
  {
    id: "registration-sarah-jones",
    athleteId: "sarah-jones",
    parentId: "sarah-jones-parent",
    parentName: "Sarah's Parent",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-12u",
    status: "Pending Review",
    details: "Registration is waiting for admin review.",
    requirements: [
      {
        label: "Birth Certificate",
        required: true,
        status: "Uploaded",
      },
      {
        label: "Waiver",
        required: true,
        status: "Submitted",
      },
      {
        label: "Physical",
        required: true,
        status: "Missing",
      },
    ],
  },
  {
    id: "registration-katie-brown",
    athleteId: "katie-brown",
    parentId: "katie-brown-parent",
    parentName: "Katie's Parent",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-12u",
    status: "Approved",
    details: "Registration is complete.",
    requirements: [
      {
        label: "Birth Certificate",
        required: true,
        status: "Approved",
      },
      {
        label: "Waiver",
        required: true,
        status: "Approved",
      },
      {
        label: "Physical",
        required: true,
        status: "Waived",
      },
    ],
  },
];

export function getRegistrationById(registrationId: string) {
  return registrations.find((registration) => registration.id === registrationId);
}

export function getRegistrationsByTeamId(teamId: string) {
  return registrations.filter((registration) => registration.teamId === teamId);
}

export function getRegistrationsByParentId(parentId: string) {
  return registrations.filter(
    (registration) => registration.parentId === parentId,
  );
}

export function getRegistrationsByOrganizationId(organizationId: string) {
  return registrations.filter(
    (registration) => registration.organizationId === organizationId,
  );
}

export function isRegistrationPending(status: RegistrationStatus) {
  return status === "Pending" || status === "Pending Review";
}

export function isRegistrationIncomplete(status: RegistrationStatus) {
  return status === "Incomplete";
}

export function isRegistrationConcern(status: RegistrationStatus) {
  return (
    isRegistrationPending(status) ||
    isRegistrationIncomplete(status) ||
    status === "Rejected"
  );
}

export function isRequirementMissing(requirement: RegistrationRequirement) {
  return requirement.status === "Missing";
}

export function isRequirementNeedsReview(requirement: RegistrationRequirement) {
  return requirement.status === "Submitted" || requirement.status === "Uploaded";
}

export function isRequirementCleared(requirement: RegistrationRequirement) {
  return requirement.status === "Approved" || requirement.status === "Waived";
}

export function isRequirementBlocked(requirement: RegistrationRequirement) {
  return requirement.status === "Rejected";
}

export function isRequirementOpen(requirement: RegistrationRequirement) {
  return (
    isRequirementMissing(requirement) ||
    isRequirementNeedsReview(requirement) ||
    isRequirementBlocked(requirement)
  );
}

export function getOpenRegistrationRequirements(
  registration?: Registration,
) {
  return (
    registration?.requirements.filter(isRequirementOpen) ?? []
  );
}

export function summarizeRegistrationRequirements(
  requirements: RegistrationRequirement[],
): RegistrationRequirementSummary {
  return requirements.reduce<RegistrationRequirementSummary>(
    (summary, requirement) => {
      if (isRequirementMissing(requirement)) {
        summary.missing += 1;
      }

      if (isRequirementNeedsReview(requirement)) {
        summary.needsReview += 1;
      }

      if (requirement.status === "Approved") {
        summary.approved += 1;
      }

      if (requirement.status === "Waived") {
        summary.waived += 1;
      }

      if (isRequirementBlocked(requirement)) {
        summary.blocked += 1;
      }

      if (isRequirementOpen(requirement)) {
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

export function summarizeRegistrations(
  registrationList: Registration[],
): RegistrationSummary {
  return registrationList.reduce<RegistrationSummary>(
    (summary, registration) => {
      if (isRegistrationPending(registration.status)) {
        summary.pendingRegistrations += 1;
      }

      if (isRegistrationIncomplete(registration.status)) {
        summary.incompleteRegistrations += 1;
      }

      if (registration.status === "Rejected") {
        summary.rejectedRegistrations += 1;
      }

      if (registration.status === "Approved") {
        summary.approvedRegistrations += 1;
      }

      if (
        registration.requirements.some(
          (requirement) =>
            requirement.label === "Physical" &&
            isRequirementMissing(requirement),
        )
      ) {
        summary.missingPhysicals += 1;
      }

      summary.missingRequirements += registration.requirements.filter(
        isRequirementMissing,
      ).length;
      summary.submittedRequirements += registration.requirements.filter(
        isRequirementNeedsReview,
      ).length;

      if (
        isRegistrationConcern(registration.status) ||
        registration.requirements.some(
          (requirement) =>
            isRequirementOpen(requirement),
        )
      ) {
        summary.concernCount += 1;
      }

      return summary;
    },
    {
      pendingRegistrations: 0,
      incompleteRegistrations: 0,
      rejectedRegistrations: 0,
      approvedRegistrations: 0,
      missingRequirements: 0,
      missingPhysicals: 0,
      submittedRequirements: 0,
      concernCount: 0,
    },
  );
}

export const registrationSummary = summarizeRegistrations(registrations);

export function getMissingRegistrationRequirements(registration?: Registration) {
  return registration?.requirements.filter(isRequirementMissing) ?? [];
}
