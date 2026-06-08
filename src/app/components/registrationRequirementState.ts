"use client";

import { useSyncExternalStore } from "react";
import type {
  RegistrationRequirement,
  RegistrationRequirementStatus,
} from "../data/registrations";
import { registrationRequirementStatusValues } from "../data/registrations";

export const registrationRequirementChangedEvent =
  "gameday:registration-requirement-changed";

const storagePrefix = "gameday.registrationRequirement";
const statusSeparator = "|";

function getStorageKey(registrationId: string, requirementLabel: string) {
  return `${storagePrefix}.${registrationId}.${encodeURIComponent(
    requirementLabel,
  )}`;
}

function isRegistrationRequirementStatus(
  value: string,
): value is RegistrationRequirementStatus {
  return registrationRequirementStatusValues.includes(
    value as RegistrationRequirementStatus,
  );
}

export function getSavedRegistrationRequirementStatus(
  registrationId: string,
  requirementLabel: string,
) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedStatus = window.localStorage.getItem(
    getStorageKey(registrationId, requirementLabel),
  );

  return savedStatus && isRegistrationRequirementStatus(savedStatus)
    ? savedStatus
    : undefined;
}

export function saveRegistrationRequirementStatus(
  registrationId: string,
  requirementLabel: string,
  status: RegistrationRequirementStatus,
) {
  window.localStorage.setItem(
    getStorageKey(registrationId, requirementLabel),
    status,
  );
  window.dispatchEvent(
    new CustomEvent(registrationRequirementChangedEvent, {
      detail: {
        registrationId,
        requirementLabel,
        status,
      },
    }),
  );
}

function getRequirementSnapshot(
  registrationId: string,
  requirements: RegistrationRequirement[],
) {
  return requirements
    .map(
      (requirement) =>
        getSavedRegistrationRequirementStatus(
          registrationId,
          requirement.label,
        ) ?? requirement.status,
    )
    .join(statusSeparator);
}

function getServerRequirementSnapshot(requirements: RegistrationRequirement[]) {
  return requirements
    .map((requirement) => requirement.status)
    .join(statusSeparator);
}

function subscribeRegistrationRequirements(
  registrationId: string,
  onStoreChange: () => void,
) {
  function handleRequirementChange(event: Event) {
    const requirementEvent = event as CustomEvent<{
      registrationId: string;
    }>;

    if (requirementEvent.detail?.registrationId === registrationId) {
      onStoreChange();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key?.startsWith(`${storagePrefix}.${registrationId}.`)) {
      onStoreChange();
    }
  }

  window.addEventListener(
    registrationRequirementChangedEvent,
    handleRequirementChange,
  );
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      registrationRequirementChangedEvent,
      handleRequirementChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function useRegistrationRequirements(
  registrationId: string,
  requirements: RegistrationRequirement[],
): RegistrationRequirement[] {
  const snapshot = useSyncExternalStore(
    (onStoreChange) =>
      subscribeRegistrationRequirements(registrationId, onStoreChange),
    () => getRequirementSnapshot(registrationId, requirements),
    () => getServerRequirementSnapshot(requirements),
  );
  const statuses = snapshot ? snapshot.split(statusSeparator) : [];

  return requirements.map<RegistrationRequirement>((requirement, index) => {
    const status = statuses[index] ?? "";

    return {
      ...requirement,
      status: isRegistrationRequirementStatus(status)
        ? status
        : requirement.status,
    };
  });
}
