"use client";

import { useSyncExternalStore } from "react";
import {
  registrationStatusValues,
  summarizeRegistrations,
  type Registration,
  type RegistrationRequirementStatus,
  type RegistrationStatus,
  type RegistrationSummary,
} from "../data/registrations";
import {
  getSavedRegistrationRequirementStatus,
  registrationRequirementChangedEvent,
} from "./registrationRequirementState";

export const registrationStatusChangedEvent =
  "gameday:registration-status-changed";

const storagePrefix = "gameday.registrationStatus";

function getStorageKey(registrationId: string) {
  return `${storagePrefix}.${registrationId}`;
}

function isRegistrationStatus(value: string): value is RegistrationStatus {
  return registrationStatusValues.includes(value as RegistrationStatus);
}

export function getSavedRegistrationStatus(registrationId: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const savedStatus = window.localStorage.getItem(getStorageKey(registrationId));

  return savedStatus && isRegistrationStatus(savedStatus)
    ? savedStatus
    : undefined;
}

export function saveRegistrationStatus(
  registrationId: string,
  status: RegistrationStatus,
) {
  window.localStorage.setItem(getStorageKey(registrationId), status);
  window.dispatchEvent(
    new CustomEvent(registrationStatusChangedEvent, {
      detail: {
        registrationId,
        status,
      },
    }),
  );
}

function subscribeRegistrationStatusChanges(onStoreChange: () => void) {
  function handleStatusChange() {
    onStoreChange();
  }

  function handleStorageChange(event: StorageEvent) {
    if (
      event.key?.startsWith(`${storagePrefix}.`) ||
      event.key?.startsWith("gameday.registrationRequirement.")
    ) {
      onStoreChange();
    }
  }

  window.addEventListener(registrationStatusChangedEvent, handleStatusChange);
  window.addEventListener(
    registrationRequirementChangedEvent,
    handleStatusChange,
  );
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      registrationStatusChangedEvent,
      handleStatusChange,
    );
    window.removeEventListener(
      registrationRequirementChangedEvent,
      handleStatusChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

function subscribeRegistrationStatus(
  registrationId: string,
  onStoreChange: () => void,
) {
  function handleStatusChange(event: Event) {
    const statusEvent = event as CustomEvent<{
      registrationId: string;
    }>;

    if (statusEvent.detail?.registrationId === registrationId) {
      onStoreChange();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key === getStorageKey(registrationId)) {
      onStoreChange();
    }
  }

  window.addEventListener(registrationStatusChangedEvent, handleStatusChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(
      registrationStatusChangedEvent,
      handleStatusChange,
    );
    window.removeEventListener("storage", handleStorageChange);
  };
}

function getRegistrationSnapshotKey(
  registrations: Registration[],
  includeSavedStatuses: boolean,
) {
  return registrations
    .map((registration) => {
      const status = includeSavedStatuses
        ? getSavedRegistrationStatus(registration.id) ?? registration.status
        : registration.status;
      const requirementStatuses = registration.requirements
        .map((requirement) =>
          includeSavedStatuses
            ? getSavedRegistrationRequirementStatus(
                registration.id,
                requirement.label,
              ) ?? requirement.status
            : requirement.status,
        )
        .join(",");

      return `${registration.id}:${status}:${requirementStatuses}`;
    })
    .join("|");
}

function applyRegistrationSnapshot(
  registrations: Registration[],
  snapshotKey: string,
) {
  const stateByRegistrationId = new Map<
    string,
    {
      requirementStatuses: RegistrationRequirementStatus[];
      status?: RegistrationStatus;
    }
  >(
    snapshotKey.split("|").map((registrationSnapshot) => {
      const [registrationId = "", status = "", requirementSnapshot = ""] =
        registrationSnapshot.split(":");
      const requirementStatuses = requirementSnapshot
        .split(",")
        .filter(
          (requirementStatus): requirementStatus is RegistrationRequirementStatus =>
            Boolean(requirementStatus),
        );

      return [
        registrationId,
        {
          requirementStatuses,
          status: isRegistrationStatus(status) ? status : undefined,
        },
      ];
    }),
  );

  return registrations.map<Registration>((registration) => {
    const registrationState = stateByRegistrationId.get(registration.id);

    return {
      ...registration,
      requirements: registration.requirements.map((requirement, index) => ({
        ...requirement,
        status:
          registrationState?.requirementStatuses[index] ?? requirement.status,
      })),
      status: registrationState?.status ?? registration.status,
    };
  });
}

export function useRegistrationStatus(
  registrationId: string,
  initialStatus: RegistrationStatus,
) {
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribeRegistrationStatus(registrationId, onStoreChange),
    () => getSavedRegistrationStatus(registrationId) ?? initialStatus,
    () => initialStatus,
  );
}

export function useRegistrations(registrations: Registration[]) {
  const snapshotKey = useSyncExternalStore(
    subscribeRegistrationStatusChanges,
    () => getRegistrationSnapshotKey(registrations, true),
    () => getRegistrationSnapshotKey(registrations, false),
  );

  return applyRegistrationSnapshot(registrations, snapshotKey);
}

export function useRegistrationSummary(
  registrations: Registration[],
): RegistrationSummary {
  return summarizeRegistrations(useRegistrations(registrations));
}

export function useRegistrationConcernCount(registrations: Registration[]) {
  return useRegistrationSummary(registrations).concernCount;
}
