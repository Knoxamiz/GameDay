import type { RepositoryActor } from "./repositories";

export type DocumentStorageTarget = {
  athleteId: string;
  documentRequirementId: string;
  organizationId: string;
  parentId: string;
  registrationId: string;
  teamId: string;
};

export type DocumentUploadRequest = {
  contentLength: number;
  contentType: string;
  originalFileName: string;
  target: DocumentStorageTarget;
};

export type SignedDocumentUpload = {
  expiresAt: string;
  headers?: Record<string, string>;
  storagePath: string;
  uploadUrl: string;
};

export type StoredDocument = {
  contentLength: number;
  contentType: string;
  downloadUrl?: string;
  originalFileName: string;
  storagePath: string;
  uploadedAt: string;
};

export interface DocumentStorageProvider {
  confirmUpload(
    storagePath: string,
    actor: RepositoryActor,
  ): Promise<StoredDocument>;
  createDownloadUrl(
    storagePath: string,
    actor: RepositoryActor,
  ): Promise<string>;
  createUploadUrl(
    request: DocumentUploadRequest,
    actor: RepositoryActor,
  ): Promise<SignedDocumentUpload>;
  deleteDocument(storagePath: string, actor: RepositoryActor): Promise<void>;
}

export function sanitizeStorageSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildDocumentStoragePath(target: DocumentStorageTarget) {
  return [
    "organizations",
    target.organizationId,
    "teams",
    target.teamId,
    "athletes",
    target.athleteId,
    "registrations",
    target.registrationId,
    "documents",
    target.documentRequirementId,
  ]
    .map(sanitizeStorageSegment)
    .join("/");
}
