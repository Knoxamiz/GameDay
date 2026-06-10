import type { RegistrationRequirementStatus } from "./registrations";
import type { PaymentRequirementStatus } from "./payments";

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
  paymentStatuses: Record<string, PaymentRequirementStatus>;
  requirementStatuses: Record<string, RegistrationRequirementStatus>;
};

export type RegistrationSubmissionSource = "firestore" | "mock";

export type RegistrationSubmissionResult = {
  athleteId?: string;
  registrationId?: string;
  source: RegistrationSubmissionSource;
};
