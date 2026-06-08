"use client";

import { useSyncExternalStore } from "react";
import {
  documentRequirementStatusValues,
  type DocumentRequirement,
  type DocumentRequirementStatus,
} from "../data/documents";

export const documentRequirementChangedEvent =
  "gameday:document-requirement-changed";

const storagePrefix = "gameday.documentRequirement";
const statusSeparator = "|";

function getStorageKey(requirementId: string) {
  return `${storagePrefix}.${requirementId}`;
}

function isDocumentRequirementStatus(
  value: string,
): value is DocumentRequirementStatus {
  return documentRequirementStatusValues.includes(
    value as DocumentRequirementStatus,
  );
}

export function getSavedDocumentRequirementStatus(requirementId: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedStatus = window.localStorage.getItem(getStorageKey(requirementId));

  return savedStatus && isDocumentRequirementStatus(savedStatus)
    ? savedStatus
    : undefined;
}

export function saveDocumentRequirementStatus(
  requirementId: string,
  status: DocumentRequirementStatus,
) {
  window.localStorage.setItem(getStorageKey(requirementId), status);
  window.dispatchEvent(
    new CustomEvent(documentRequirementChangedEvent, {
      detail: {
        requirementId,
        status,
      },
    }),
  );
}

function getDocumentRequirementSnapshot(
  requirements: DocumentRequirement[],
  includeSavedStatuses: boolean,
) {
  return requirements
    .map((requirement) => {
      const status = includeSavedStatuses
        ? getSavedDocumentRequirementStatus(requirement.id) ?? requirement.status
        : requirement.status;

      return `${requirement.id}:${status}`;
    })
    .join(statusSeparator);
}

function subscribeDocumentRequirements(onStoreChange: () => void) {
  function handleRequirementChange() {
    onStoreChange();
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key?.startsWith(`${storagePrefix}.`)) {
      onStoreChange();
    }
  }

  window.addEventListener(documentRequirementChangedEvent, handleRequirementChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      documentRequirementChangedEvent,
      handleRequirementChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function useDocumentRequirements(requirements: DocumentRequirement[]) {
  const snapshot = useSyncExternalStore(
    subscribeDocumentRequirements,
    () => getDocumentRequirementSnapshot(requirements, true),
    () => getDocumentRequirementSnapshot(requirements, false),
  );
  const statusesById = new Map(
    snapshot.split(statusSeparator).map((requirementSnapshot) => {
      const [requirementId = "", status = ""] = requirementSnapshot.split(":");

      return [
        requirementId,
        isDocumentRequirementStatus(status) ? status : undefined,
      ];
    }),
  );

  return requirements.map<DocumentRequirement>((requirement) => ({
    ...requirement,
    status: statusesById.get(requirement.id) ?? requirement.status,
  }));
}
