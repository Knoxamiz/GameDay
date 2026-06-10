import type {
  RegistrationRequirementStatus,
  RegistrationStatus,
} from "./registrations";
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
  athleteName?: string;
  parentId?: string;
  parentName?: string;
  parentUid?: string;
  registrationId?: string;
  source: RegistrationSubmissionSource;
  status?: RegistrationStatus;
};
