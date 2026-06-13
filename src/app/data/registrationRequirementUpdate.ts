import type { RegistrationRequirementStatus } from "./registrations";

export const registrationDocumentMaxBytes = 10 * 1024 * 1024;

export const registrationDocumentContentTypes = [
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function isRegistrationDocumentContentType(value: string) {
  return registrationDocumentContentTypes.includes(
    value as (typeof registrationDocumentContentTypes)[number],
  );
}

export type ParentRegistrationRequirementUpdatePayload = {
  athleteId: string;
  parentId: string;
  registrationId: string;
  requirementId: string;
  requirementLabel: string;
  status: RegistrationRequirementStatus;
};

export type ParentRegistrationRequirementUpdateResult = {
  source: "firestore";
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
  source: "firestore";
  storagePath?: string;
};
