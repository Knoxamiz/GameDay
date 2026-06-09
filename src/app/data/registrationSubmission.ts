import type { RegistrationRequirementStatus } from "./registrations";

export type RegistrationSubmissionPayload = {
  athlete: {
    firstName: string;
    grade: string;
    lastName: string;
    school: string;
  };
  inviteCode: string;
  parent: {
    email: string;
    name: string;
    phone: string;
  };
  requirementStatuses: Record<string, RegistrationRequirementStatus>;
};

export type RegistrationSubmissionSource = "firestore" | "mock";

export type RegistrationSubmissionResult = {
  athleteId?: string;
  registrationId?: string;
  source: RegistrationSubmissionSource;
};
