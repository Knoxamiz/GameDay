import type { AuthSessionSource } from "../infrastructure/auth";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { FirebaseAdminAuthProvider } from "../infrastructure/firebaseAuth";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";
import { FirebaseDocumentStorageAdapter } from "../infrastructure/firebaseStorage";
import type {
  ParentRegistrationRequirementUploadPayload,
  ParentRegistrationRequirementUploadResult,
  ParentRegistrationRequirementUpdatePayload,
  ParentRegistrationRequirementUpdateResult,
} from "./registrationRequirementUpdate";
import type {
  RegistrationRequirement,
  RegistrationRequirementStatus,
} from "./registrations";

type UpdateParentRegistrationRequirementOptions = {
  sessionSource: AuthSessionSource;
};

function fallbackResult(): ParentRegistrationRequirementUpdateResult {
  return {
    source: "mock",
  };
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isParentSubmissionStatus(status: RegistrationRequirementStatus) {
  return status === "Uploaded" || status === "Submitted";
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
    return fallbackResult();
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
    return fallbackResult();
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(options.sessionSource);

  if (session?.claims.role !== "parent" || session.claims.parentId !== parentId) {
    return fallbackResult();
  }

  const repositories = createFirestoreRepositories();
  const registration = await repositories.registrations.getById(registrationId);

  if (
    !registration ||
    registration.parentId !== parentId ||
    registration.athleteId !== athleteId
  ) {
    return fallbackResult();
  }

  const requirements = updateRequirementStatus(
    registration.requirements,
    requirementLabel,
    payload.status,
  );

  if (!requirements) {
    return fallbackResult();
  }

  await repositories.registrations.update(
    registrationId,
    {
      requirements,
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
    return fallbackResult();
  }

  const athleteId = normalizeText(payload.athleteId);
  const contentType =
    normalizeText(payload.contentType) || "application/octet-stream";
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
    payload.contentLength <= 0
  ) {
    return fallbackResult();
  }

  const authProvider = new FirebaseAdminAuthProvider();
  const session = await authProvider.verifySession(options.sessionSource);

  if (session?.claims.role !== "parent" || session.claims.parentId !== parentId) {
    return fallbackResult();
  }

  const repositories = createFirestoreRepositories();
  const registration = await repositories.registrations.getById(registrationId);

  if (
    !registration ||
    registration.athleteId !== athleteId ||
    registration.organizationId !== organizationId ||
    registration.parentId !== parentId
  ) {
    return fallbackResult();
  }

  if (
    !registration.requirements.some(
      (requirement) => requirement.label === requirementLabel,
    )
  ) {
    return fallbackResult();
  }

  const actor = {
    athleteIds: session.claims.athleteIds,
    id: parentId,
    organizationIds: session.claims.organizationIds,
    role: session.claims.role,
    teamIds: session.claims.teamIds,
  };
  const storage = new FirebaseDocumentStorageAdapter();
  const storedDocument = await storage.uploadDocument(
    {
      contentLength: payload.contentLength,
      contentType,
      data: payload.data,
      originalFileName: fileName,
      target: {
        athleteId,
        documentRequirementId: requirementId,
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
    return fallbackResult();
  }

  await repositories.registrations.update(
    registrationId,
    {
      requirements,
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
