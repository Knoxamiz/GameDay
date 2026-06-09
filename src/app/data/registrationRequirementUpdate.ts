import type { RegistrationRequirementStatus } from "./registrations";

export type ParentRegistrationRequirementUpdatePayload = {
  athleteId: string;
  parentId: string;
  registrationId: string;
  requirementId: string;
  requirementLabel: string;
  status: RegistrationRequirementStatus;
};

export type ParentRegistrationRequirementUpdateResult = {
  source: "firestore" | "mock";
};
