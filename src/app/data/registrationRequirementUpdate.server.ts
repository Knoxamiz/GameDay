import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { FirebaseDocumentStorageAdapter } from "../infrastructure/firebaseStorage";
import { getLiveParentId } from "./liveIdentity";
import type {
  ParentRegistrationRequirementUploadPayload,
  ParentRegistrationRequirementUploadResult,
  ParentRegistrationRequirementUpdatePayload,
  ParentRegistrationRequirementUpdateResult,
} from "./registrationRequirementUpdate";
import {
  isRegistrationDocumentContentType,
  registrationDocumentMaxBytes,
} from "./registrationRequirementUpdate";
import type {
  RegistrationRequirement,
  RegistrationRequirementStatus,
} from "./registrations";

type UpdateParentRegistrationRequirementOptions = {
  sessionSource: AuthSessionSource;
};

export class ParentRegistrationRequirementError extends Error {
  constructor(
    readonly reason: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ParentRegistrationRequirementError";
  }
}

function createRequirementError(
  reason: string,
  message: string,
  status = 400,
): never {
  throw new ParentRegistrationRequirementError(reason, message, status);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getRequirementStorageId(
  registrationId: string,
  requirementLabel: string,
) {
  const labelSegment = requirementLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${registrationId}-${labelSegment || "requirement"}`;
}

function isParentSubmissionStatus(status: RegistrationRequirementStatus) {
  return status === "Submitted";
}

function updateRequirementStatus(
  requirements: RegistrationRequirement[],
  requirementLabel: string,
  status: RegistrationRequirementStatus,
) {
  let foundRequirement = false;
  const updatedRequirements = requirements.map((requirement) => {
    if (requirement.label !== requirementLabel) {
      return requirement;
    }

    foundRequirement = true;

    return {
      ...requirement,
      status,
    };
  });

  return foundRequirement ? updatedRequirements : null;
}

function updateRequirementUploadMetadata(
  requirements: RegistrationRequirement[],
  requirementLabel: string,
  metadata: {
    contentType: string;
    fileName: string;
    status: RegistrationRequirementStatus;
    storagePath: string;
    uploadedAt: string;
  },
) {
  let foundRequirement = false;
  const updatedRequirements = requirements.map((requirement) => {
    if (requirement.label !== requirementLabel) {
      return requirement;
    }

    foundRequirement = true;

    return {
      ...requirement,
      contentType: metadata.contentType,
      fileName: metadata.fileName,
      status: metadata.status,
      storagePath: metadata.storagePath,
      uploadedAt: metadata.uploadedAt,
    };
  });

  return foundRequirement ? updatedRequirements : null;
}

export async function updateParentRegistrationRequirementStatus(
  payload: ParentRegistrationRequirementUpdatePayload,
  options: UpdateParentRegistrationRequirementOptions,
): Promise<ParentRegistrationRequirementUpdateResult> {
  if (!getFirebaseAdminConfig()) {
    createRequirementError(
      "firebase-unavailable",
      "Registration document updates are not available until Firebase is configured.",
      503,
    );
  }

  const athleteId = normalizeText(payload.athleteId);
  const parentId = normalizeText(payload.parentId);
  const registrationId = normalizeText(payload.registrationId);
  const requirementId = normalizeText(payload.requirementId);
  const requirementLabel = normalizeText(payload.requirementLabel);

  if (
    !athleteId ||
    !parentId ||
    !registrationId ||
    !requirementId ||
    !requirementLabel ||
    !isParentSubmissionStatus(payload.status)
  ) {
    createRequirementError(
      "invalid-requirement-update",
      "Could not update this registration requirement.",
      400,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider
    .verifySession(options.sessionSource)
    .catch(() => null);
  const liveParentId = getLiveParentId(session);

  if (
    !session ||
    session.claims.role !== "parent" ||
    !liveParentId ||
    liveParentId !== parentId
  ) {
    createRequirementError(
      "parent-session-required",
      "Please sign in as the parent owner before updating registration.",
      403,
    );
  }

  const repositories = createFirestoreRepositories();
  const registration = await repositories.registrations.getById(registrationId);

  if (
    !registration ||
    registration.parentId !== parentId ||
    registration.athleteId !== athleteId
  ) {
    createRequirementError(
      "registration-not-found",
      "Could not find a registration owned by this parent.",
      404,
    );
  }

  const requirements = updateRequirementStatus(
    registration.requirements,
    requirementLabel,
    payload.status,
  );

  if (!requirements) {
    createRequirementError(
      "requirement-not-found",
      "Could not find this registration requirement.",
      404,
    );
  }

  await repositories.registrations.update(
    registrationId,
    {
      requirements,
      updatedAt: new Date().toISOString(),
    },
    {
      actor: {
        athleteIds: session.claims.athleteIds,
        id: parentId,
        organizationIds: session.claims.organizationIds,
        role: session.claims.role,
        teamIds: session.claims.teamIds,
      },
      reason: "Parent updated a registration document requirement.",
    },
  );

  return {
    source: "firestore",
  };
}

export async function uploadParentRegistrationRequirementDocument(
  payload: ParentRegistrationRequirementUploadPayload,
  options: UpdateParentRegistrationRequirementOptions,
): Promise<ParentRegistrationRequirementUploadResult> {
  if (!getFirebaseAdminConfig()) {
    createRequirementError(
      "firebase-unavailable",
      "Registration document uploads are not available until Firebase is configured.",
      503,
    );
  }

  const athleteId = normalizeText(payload.athleteId);
  const contentType = normalizeText(payload.contentType);
  const fileName = normalizeText(payload.fileName);
  const organizationId = normalizeText(payload.organizationId);
  const parentId = normalizeText(payload.parentId);
  const registrationId = normalizeText(payload.registrationId);
  const requirementId = normalizeText(payload.requirementId);
  const requirementLabel = normalizeText(payload.requirementLabel);

  if (
    !athleteId ||
    !fileName ||
    !organizationId ||
    !parentId ||
    !registrationId ||
    !requirementId ||
    !requirementLabel ||
    payload.contentLength <= 0 ||
    payload.contentLength > registrationDocumentMaxBytes ||
    !isRegistrationDocumentContentType(contentType)
  ) {
    createRequirementError(
      "invalid-requirement-upload",
      "Choose a document before uploading.",
      400,
    );
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider
    .verifySession(options.sessionSource)
    .catch(() => null);
  const liveParentId = getLiveParentId(session);

  if (
    !session ||
    session.claims.role !== "parent" ||
    !liveParentId ||
    liveParentId !== parentId
  ) {
    createRequirementError(
      "parent-session-required",
      "Please sign in as the parent owner before uploading documents.",
      403,
    );
  }

  const repositories = createFirestoreRepositories();
  const registration = await repositories.registrations.getById(registrationId);

  if (
    !registration ||
    registration.athleteId !== athleteId ||
    registration.organizationId !== organizationId ||
    registration.parentId !== parentId
  ) {
    createRequirementError(
      "registration-not-found",
      "Could not find a registration owned by this parent.",
      404,
    );
  }

  if (
    !registration.requirements.some(
      (requirement) => requirement.label === requirementLabel,
    )
  ) {
    createRequirementError(
      "requirement-not-found",
      "Could not find this registration requirement.",
      404,
    );
  }

  const actor = {
    athleteIds: session.claims.athleteIds,
    id: parentId,
    organizationIds: session.claims.organizationIds,
    role: session.claims.role,
    teamIds: session.claims.teamIds,
  };
  const storageRequirementId = getRequirementStorageId(
    registration.id,
    requirementLabel,
  );
  const storage = new FirebaseDocumentStorageAdapter();
  const storedDocument = await storage.uploadDocument(
    {
      contentLength: payload.contentLength,
      contentType,
      data: payload.data,
      originalFileName: fileName,
      target: {
        athleteId,
        documentRequirementId: storageRequirementId,
        organizationId,
        parentId,
        registrationId,
        teamId: registration.teamId,
      },
    },
    actor,
  );
  const requirements = updateRequirementUploadMetadata(
    registration.requirements,
    requirementLabel,
    {
      contentType: storedDocument.contentType,
      fileName: storedDocument.originalFileName,
      status: "Uploaded",
      storagePath: storedDocument.storagePath,
      uploadedAt: storedDocument.uploadedAt,
    },
  );

  if (!requirements) {
    createRequirementError(
      "requirement-not-found",
      "Could not find this registration requirement.",
      404,
    );
  }

  await repositories.registrations.update(
    registrationId,
    {
      requirements,
      updatedAt: storedDocument.uploadedAt,
    },
    {
      actor,
      reason: "Parent uploaded a registration document.",
    },
  );

  return {
    source: "firestore",
    storagePath: storedDocument.storagePath,
  };
}
