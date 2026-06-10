import type { PaymentRequirementStatus } from "./payments";

export type ParentPaymentRequirementUpdatePayload = {
  amountDue: number;
  athleteId: string;
  description: string;
  label: string;
  organizationId: string;
  parentId: string;
  paymentRequirementId: string;
  registrationId: string;
  required: boolean;
  status: PaymentRequirementStatus;
};

export type ParentPaymentRequirementUpdateResult = {
  source: "firestore" | "mock";
};
