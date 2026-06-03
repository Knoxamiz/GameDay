export type RegistrationRequirementStatus = "Complete" | "Missing";
export type RegistrationStatus =
  | "Approved"
  | "Rejected"
  | "Incomplete"
  | "Pending"
  | "Pending Review";

export type RegistrationRequirement = {
  label: string;
  status: RegistrationRequirementStatus;
};

export type Registration = {
  id: string;
  athleteId: string;
  parentName: string;
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
  missingPhysicals: number;
  concernCount: number;
};

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
    parentName: "Jennifer Smith",
    teamId: "black-diamonds-12u",
    status: "Incomplete",
    details: "One required document still needs to be submitted.",
    submittedDate: "May 31, 2026",
    requirements: [
      {
        label: "Birth Certificate",
        status: "Complete",
      },
      {
        label: "Waiver",
        status: "Complete",
      },
      {
        label: "Photo",
        status: "Complete",
      },
      {
        label: "Physical",
        status: "Missing",
      },
    ],
  },
  {
    id: "registration-olivia-smith",
    athleteId: "olivia-smith",
    parentName: "Jennifer Smith",
    teamId: "black-diamonds-10u",
    status: "Incomplete",
    details: "Emergency contact form still needs parent signature.",
    requirements: [
      {
        label: "Birth Certificate",
        status: "Complete",
      },
      {
        label: "Waiver",
        status: "Missing",
      },
      {
        label: "Photo",
        status: "Complete",
      },
      {
        label: "Physical",
        status: "Complete",
      },
    ],
  },
  {
    id: "registration-mason-smith",
    athleteId: "mason-smith",
    parentName: "Jennifer Smith",
    teamId: "black-diamonds-hs",
    status: "Pending",
    details: "Season registration has not opened yet.",
    requirements: [
      {
        label: "Birth Certificate",
        status: "Missing",
      },
      {
        label: "Waiver",
        status: "Missing",
      },
      {
        label: "Photo",
        status: "Missing",
      },
      {
        label: "Physical",
        status: "Missing",
      },
    ],
  },
  {
    id: "registration-sarah-jones",
    athleteId: "sarah-jones",
    parentName: "Avery Jones",
    teamId: "black-diamonds-14u",
    status: "Pending Review",
    details: "Registration is waiting for admin review.",
    requirements: [],
  },
  {
    id: "registration-katie-brown",
    athleteId: "katie-brown",
    parentName: "Morgan Brown",
    teamId: "black-diamonds-12u",
    status: "Approved",
    details: "Registration is complete.",
    requirements: [],
  },
];

export function getRegistrationById(registrationId: string) {
  return registrations.find((registration) => registration.id === registrationId);
}

export function getRegistrationsByTeamId(teamId: string) {
  return registrations.filter((registration) => registration.teamId === teamId);
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
            requirement.status === "Missing",
        )
      ) {
        summary.missingPhysicals += 1;
      }

      if (isRegistrationConcern(registration.status)) {
        summary.concernCount += 1;
      }

      return summary;
    },
    {
      pendingRegistrations: 0,
      incompleteRegistrations: 0,
      rejectedRegistrations: 0,
      approvedRegistrations: 0,
      missingPhysicals: 0,
      concernCount: 0,
    },
  );
}

export const registrationSummary = summarizeRegistrations(registrations);

export function getMissingRegistrationRequirements(registration?: Registration) {
  return registration?.requirements.filter(
    (requirement) => requirement.status === "Missing",
  ) ?? [];
}
