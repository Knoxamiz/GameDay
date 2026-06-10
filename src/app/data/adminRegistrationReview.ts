import type { PaymentRequirementStatus } from "./payments";
import type {
  RegistrationRequirementStatus,
  RegistrationStatus,
} from "./registrations";

export type AdminRegistrationReviewSource = "firestore";

export type AdminRegistrationReviewPayload =
  | {
      actionType: "registration-status";
      adminNotes?: string;
      registrationId: string;
      status: RegistrationStatus;
    }
  | {
      actionType: "requirement-status";
      adminNotes?: string;
      requirementId?: string;
      requirementLabel: string;
      registrationId: string;
      status: RegistrationRequirementStatus;
    }
  | {
      actionType: "payment-status";
      adminNotes?: string;
      amountDue: number;
      description: string;
      label: string;
      paymentRequirementId: string;
      registrationId: string;
      required: boolean;
      status: PaymentRequirementStatus;
    };

export type AdminRegistrationReviewResult = {
  denied?: boolean;
  reason?: string;
  source: AdminRegistrationReviewSource;
};
