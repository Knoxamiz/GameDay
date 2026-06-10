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

export type ParentRegistrationRequirementUploadPayload = {
  athleteId: string;
  contentLength: number;
  contentType: string;
  data: Buffer;
  fileName: string;
  organizationId: string;
  parentId: string;
  registrationId: string;
  requirementId: string;
  requirementLabel: string;
};

export type ParentRegistrationRequirementUploadResult = {
  source: "firestore" | "mock";
  storagePath?: string;
};
