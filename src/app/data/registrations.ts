import type { PaymentRequirement } from "./payments";
import type {
  ParentRegistrationChangeRequest,
  ParentRegistrationWithdrawalRequest,
} from "./parentRegistrationLifecycle";

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
  | "Inactive"
  | "Pending"
  | "Pending Review"
  | "Withdrawn"
  | "Waitlisted";

export type RosterStatus = "not_rostered" | "rostered" | "inactive";

export type RegistrationRequirement = {
  adminNotes?: string;
  contentType?: string;
  description?: string;
  fileName?: string;
  label: string;
  reviewedAt?: string;
  reviewedBy?: string;
  required?: boolean;
  status: RegistrationRequirementStatus;
  storagePath?: string;
  uploadedAt?: string;
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
  athleteName?: string;
  parentId: string;
  parentUid?: string;
  parentName: string;
  organizationId: string;
  teamId: string;
  adminNotes?: string;
  createdAt?: string;
  createdByUid?: string;
  ownerUid?: string;
  parentChangeRequest?: ParentRegistrationChangeRequest;
  paymentRequirements?: PaymentRequirement[];
  registrationInviteId?: string;
  registrationId?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rosteredAt?: string;
  rosteredBy?: string;
  rosterStatus?: RosterStatus;
  source?: string;
  status: RegistrationStatus;
  details: string;
  inviteCode?: string;
  submittedDate?: string;
  updatedAt?: string;
  withdrawalRequest?: ParentRegistrationWithdrawalRequest;
  withdrawnAt?: string;
  withdrawnByUid?: string;
  withdrawalReason?: string;
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
  "Inactive",
  "Pending",
  "Pending Review",
  "Withdrawn",
  "Waitlisted",
];

export const registrationAdminDecisionOptions: RegistrationStatus[] = [
  "Approved",
  "Incomplete",
  "Rejected",
  "Waitlisted",
];

export const rosterStatusValues: RosterStatus[] = [
  "not_rostered",
  "rostered",
  "inactive",
];

export const registrationForm = {
  organizationId: "",
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
    parentName: "",
    athleteName: "",
    teamLabel: "",
    requirements: [
      "Birth Certificate",
      "Physical",
      "Waiver",
    ],
  },
  submitted: {
    athleteName: "",
    teamLabel: "",
    status: "Pending Review",
    submittedDate: "",
    nextSteps: [
      "Admin reviews registration",
      "Team assignment confirmed",
      "Parent notified automatically",
    ],
  },
};

export const registrations: Registration[] = [];

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
    status === "Rejected" ||
    status === "Withdrawn" ||
    status === "Inactive" ||
    status === "Waitlisted"
  );
}

export function isRegistrationTerminal(status: RegistrationStatus) {
  return (
    status === "Rejected" ||
    status === "Withdrawn" ||
    status === "Inactive"
  );
}

export function canParentDirectlyCorrectRegistration(
  registration: Registration,
) {
  return Boolean(
    !registration.reviewedAt &&
      getRegistrationRosterStatus(registration) === "not_rostered" &&
      isRegistrationPending(registration.status),
  );
}

export function hasPendingParentLifecycleRequest(registration: Registration) {
  return (
    registration.parentChangeRequest?.status === "pending" ||
    registration.withdrawalRequest?.status === "pending"
  );
}

export function getRegistrationRosterStatus(registration?: Registration | null) {
  return registration?.rosterStatus ?? "not_rostered";
}

export function getRosterStatusLabel(status: RosterStatus) {
  if (status === "rostered") {
    return "Rostered";
  }

  if (status === "inactive") {
    return "Inactive";
  }

  return "Not Rostered";
}

export function isCoachVisibleRosterRegistration(registration: Registration) {
  return (
    getRegistrationRosterStatus(registration) === "rostered" &&
    !isRegistrationTerminal(registration.status) &&
    registration.status !== "Waitlisted"
  );
}

export function isParentEventEligibleRegistration(
  registration: Registration,
) {
  return (
    getRegistrationRosterStatus(registration) !== "inactive" &&
    !isRegistrationTerminal(registration.status) &&
    registration.status !== "Waitlisted"
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
